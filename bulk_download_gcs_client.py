"""
Bulk Download Videos using Google Cloud Storage Client (FASTER!)
=================================================================
Uses official GCS Python client for faster, more reliable downloads.
Expected time: 1.5-3 hours for 13k videos (faster than HTTP method!)

Storage needed: ~589 GB (you have 2 TB, so plenty of space!)
"""

import os
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from google.cloud import storage
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from collections import defaultdict

# Configuration
BUCKET_NAME = 'brb-traffic'
SAVE_DIR = '/content/drive/MyDrive/barbados_traffic/videos'
MAX_WORKERS = 20  # GCS client can handle more parallel downloads
BATCH_SAVE_INTERVAL = 500  # Save progress every N videos

def download_single_video_gcs(blob_name, bucket, save_dir=SAVE_DIR):
    """
    Download a single video using GCS client.

    Args:
        blob_name: Full blob path (e.g., 'normanniles1/normanniles1_2025-10-20-06-00-45.mp4')
        bucket: GCS bucket object
        save_dir: Base directory to save videos

    Returns:
        dict with status and info
    """
    try:
        # Parse blob name
        parts = blob_name.split('/')
        if len(parts) != 2:
            return {'blob': blob_name, 'status': 'invalid_path'}

        camera_name, filename = parts

        # Create camera subfolder
        camera_dir = os.path.join(save_dir, camera_name)
        os.makedirs(camera_dir, exist_ok=True)

        local_path = os.path.join(camera_dir, filename)

        # Skip if already exists
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            return {'blob': blob_name, 'status': 'exists', 'path': local_path}

        # Download using GCS client
        blob = bucket.blob(blob_name)
        blob.download_to_filename(local_path)

        # Verify download
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            file_size = os.path.getsize(local_path)
            return {'blob': blob_name, 'status': 'success', 'path': local_path, 'size': file_size}
        else:
            return {'blob': blob_name, 'status': 'failed', 'error': 'Empty file'}

    except Exception as e:
        return {'blob': blob_name, 'status': 'failed', 'error': str(e)}

def bulk_download_gcs_parallel(video_list, bucket, max_workers=MAX_WORKERS):
    """
    Download videos in parallel using GCS client.

    Args:
        video_list: List of video blob paths
        bucket: GCS bucket object
        max_workers: Number of parallel downloads
    """

    print(f"\n{'='*70}")
    print(f"📹 BULK VIDEO DOWNLOAD (Google Cloud Storage Client)")
    print(f"{'='*70}")
    print(f"Total videos: {len(video_list):,}")
    print(f"Save location: {SAVE_DIR}")
    print(f"Parallel workers: {max_workers}")
    print(f"Storage needed: ~589 GB (you have 2 TB - plenty!)")
    print(f"{'='*70}\n")

    # Check existing videos
    existing_count = 0
    existing_size = 0
    if os.path.exists(SAVE_DIR):
        for root, dirs, files in os.walk(SAVE_DIR):
            for f in files:
                if f.endswith('.mp4'):
                    existing_count += 1
                    existing_size += os.path.getsize(os.path.join(root, f))

    existing_gb = existing_size / (1024**3)
    print(f"📊 Found {existing_count:,} existing videos ({existing_gb:.1f} GB)")
    videos_to_download = len(video_list) - existing_count

    if videos_to_download <= 0:
        print("✅ All videos already downloaded!")
        return

    print(f"📥 Need to download: {videos_to_download:,} videos")
    estimated_gb = videos_to_download * (589 / 18532)  # ~31.8 MB average per video
    print(f"   Estimated size: ~{estimated_gb:.1f} GB")
    print(f"\n⏱️  Estimated time: {videos_to_download / 4000:.1f} - {videos_to_download / 6000:.1f} hours\n")

    # Results tracking
    results = {
        'success': 0,
        'exists': 0,
        'failed': 0,
        'total_bytes': 0
    }
    failed_videos = []
    camera_stats = defaultdict(lambda: {'count': 0, 'size': 0})

    start_time = time.time()
    last_save_count = 0

    # Download with ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_video = {
            executor.submit(download_single_video_gcs, video, bucket): video
            for video in video_list
        }

        # Process completed downloads with progress bar
        with tqdm(total=len(video_list), desc="Downloading", unit="video") as pbar:
            for future in as_completed(future_to_video):
                result = future.result()

                if result['status'] == 'success':
                    results['success'] += 1
                    results['total_bytes'] += result.get('size', 0)

                    # Track per-camera stats
                    camera = result['blob'].split('/')[0]
                    camera_stats[camera]['count'] += 1
                    camera_stats[camera]['size'] += result.get('size', 0)

                elif result['status'] == 'exists':
                    results['exists'] += 1
                else:
                    results['failed'] += 1
                    failed_videos.append({'video': result['blob'], 'error': result.get('error', 'Unknown')})

                pbar.update(1)

                # Calculate stats
                elapsed = time.time() - start_time
                total_processed = results['success'] + results['exists']
                rate = total_processed / (elapsed / 3600) if elapsed > 0 else 0
                downloaded_gb = results['total_bytes'] / (1024**3)

                pbar.set_postfix({
                    'success': results['success'],
                    'exists': results['exists'],
                    'failed': results['failed'],
                    'rate': f"{rate:.0f}/hr",
                    'GB': f"{downloaded_gb:.1f}"
                })

                # Save progress periodically
                if total_processed - last_save_count >= BATCH_SAVE_INTERVAL:
                    save_progress(results, camera_stats, failed_videos)
                    last_save_count = total_processed

    # Final stats
    elapsed_hours = (time.time() - start_time) / 3600
    total_gb = results['total_bytes'] / (1024**3)

    print(f"\n{'='*70}")
    print(f"🎉 DOWNLOAD COMPLETE!")
    print(f"{'='*70}")
    print(f"✅ Successfully downloaded: {results['success']:,} videos ({total_gb:.1f} GB)")
    print(f"📁 Already existed: {results['exists']:,}")
    print(f"❌ Failed: {results['failed']:,}")
    print(f"⏱️  Total time: {elapsed_hours:.2f} hours")

    if total_processed > 0:
        print(f"📊 Average speed: {total_processed / elapsed_hours:.0f} videos/hour")
        print(f"💾 Download speed: {total_gb / elapsed_hours:.1f} GB/hour")

    print(f"\n📂 Per-Camera Stats:")
    for camera in sorted(camera_stats.keys()):
        count = camera_stats[camera]['count']
        size_gb = camera_stats[camera]['size'] / (1024**3)
        print(f"   {camera}: {count:,} videos, {size_gb:.1f} GB")

    print(f"{'='*70}\n")

    # Save final results
    save_progress(results, camera_stats, failed_videos, final=True)

    return results

def save_progress(results, camera_stats, failed_videos, final=False):
    """Save download progress to files."""
    progress_dir = '/content/drive/MyDrive/barbados_traffic/download_progress'
    os.makedirs(progress_dir, exist_ok=True)

    # Save summary
    summary_path = os.path.join(progress_dir, 'download_summary.txt')
    with open(summary_path, 'w') as f:
        f.write(f"Download Progress Summary\n")
        f.write(f"{'='*50}\n")
        f.write(f"Success: {results['success']:,}\n")
        f.write(f"Exists: {results['exists']:,}\n")
        f.write(f"Failed: {results['failed']:,}\n")
        f.write(f"Total GB: {results['total_bytes'] / (1024**3):.2f}\n")
        f.write(f"\nPer-Camera Stats:\n")
        for camera in sorted(camera_stats.keys()):
            count = camera_stats[camera]['count']
            size_gb = camera_stats[camera]['size'] / (1024**3)
            f.write(f"  {camera}: {count:,} videos, {size_gb:.1f} GB\n")

    # Save failed videos
    if failed_videos:
        failed_df = pd.DataFrame(failed_videos)
        failed_path = os.path.join(progress_dir, 'failed_downloads.csv')
        failed_df.to_csv(failed_path, index=False)

        if final:
            print(f"⚠️  Saved {len(failed_videos)} failed videos to: {failed_path}")

def main():
    """Main execution function."""

    # Initialize GCS client
    print("🔧 Initializing Google Cloud Storage client...")
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    print(f"✅ Connected to bucket: {BUCKET_NAME}\n")

    # Load video list from Train.csv
    train_csv = '/content/drive/MyDrive/barbados_traffic/data/Train.csv'
    print("📂 Loading video list from Train.csv...")
    train_df = pd.read_csv(train_csv)
    video_list = train_df['videos'].unique().tolist()
    print(f"✅ Found {len(video_list):,} unique videos\n")

    # Confirm before starting
    print("⚠️  This will download ~589 GB to your Google Drive")
    print("⚠️  Estimated time: 1.5-3 hours with GCS client")
    print("⚠️  Make sure Colab doesn't timeout (keep browser open)\n")
    print("Starting in 5 seconds... (Press Ctrl+C to cancel)\n")
    time.sleep(5)

    # Start bulk download
    results = bulk_download_gcs_parallel(video_list, bucket)

    print("\n✅ All done! Now modify your processing notebook to read from Drive.")
    print(f"   Videos location: {SAVE_DIR}")
    print(f"\n🚀 Next: Processing will be ~50% faster (no download delays!)")

if __name__ == "__main__":
    main()
