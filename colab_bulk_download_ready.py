"""
Drop-in Bulk Download Code for Your Colab Notebook
===================================================
Replace your single-video download loop with this parallel version.
Uses your existing GCS client and authentication.
"""

# ============================================================================
# PASTE THIS AFTER YOUR EXISTING SETUP CODE (after client = storage.Client...)
# ============================================================================

import os
import pandas as pd
from google.cloud import storage
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Configuration
SAVE_DIR = '/content/drive/MyDrive/videos'  # Save to Drive for persistence
MAX_WORKERS = 20  # Parallel downloads (adjust if hitting rate limits)

def download_single_video(blob_name, client, bucket_name, save_dir):
    """
    Download one video with proper folder organization.

    Args:
        blob_name: Full path like 'normanniles1/normanniles1_2025-10-20-06-00-45.mp4'
        client: GCS storage client
        bucket_name: Name of GCS bucket
        save_dir: Base directory to save videos

    Returns:
        dict with status
    """
    try:
        # Parse camera and filename
        parts = blob_name.split('/')
        if len(parts) != 2:
            return {'blob': blob_name, 'status': 'invalid'}

        camera_name, filename = parts

        # Create camera subfolder
        camera_dir = os.path.join(save_dir, camera_name)
        os.makedirs(camera_dir, exist_ok=True)

        local_path = os.path.join(camera_dir, filename)

        # Skip if already exists and has content
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            return {
                'blob': blob_name,
                'status': 'exists',
                'path': local_path,
                'size': os.path.getsize(local_path)
            }

        # Download from GCS
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(local_path)

        # Verify
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            return {
                'blob': blob_name,
                'status': 'success',
                'path': local_path,
                'size': os.path.getsize(local_path)
            }
        else:
            return {'blob': blob_name, 'status': 'failed', 'error': 'Empty file'}

    except Exception as e:
        return {'blob': blob_name, 'status': 'failed', 'error': str(e)}

def bulk_download_parallel(video_list, client, bucket_name, save_dir=SAVE_DIR, max_workers=MAX_WORKERS):
    """
    Download all videos in parallel.

    Args:
        video_list: List of video blob paths
        client: GCS storage client
        bucket_name: GCS bucket name
        save_dir: Where to save videos
        max_workers: Number of parallel downloads
    """

    print(f"\n{'='*70}")
    print(f"📹 BULK VIDEO DOWNLOAD (Parallel GCS)")
    print(f"{'='*70}")
    print(f"Total videos: {len(video_list):,}")
    print(f"Save location: {save_dir}")
    print(f"Parallel workers: {max_workers}")
    print(f"{'='*70}\n")

    # Check what's already downloaded
    existing_count = 0
    existing_size = 0

    if os.path.exists(save_dir):
        for root, dirs, files in os.walk(save_dir):
            for f in files:
                if f.endswith('.mp4'):
                    existing_count += 1
                    file_path = os.path.join(root, f)
                    existing_size += os.path.getsize(file_path)

    existing_gb = existing_size / (1024**3)
    to_download = len(video_list) - existing_count

    print(f"📊 Status:")
    print(f"   Already downloaded: {existing_count:,} videos ({existing_gb:.1f} GB)")
    print(f"   Need to download: {to_download:,} videos")

    if to_download <= 0:
        print("\n✅ All videos already downloaded!")
        return {'success': 0, 'exists': existing_count, 'failed': 0}

    estimated_gb = to_download * 31.8 / 1024  # ~31.8 MB average
    estimated_hours_min = to_download / 6000
    estimated_hours_max = to_download / 4000

    print(f"   Estimated size: ~{estimated_gb:.1f} GB")
    print(f"   Estimated time: {estimated_hours_min:.1f} - {estimated_hours_max:.1f} hours\n")

    # Results tracking
    results = {
        'success': 0,
        'exists': 0,
        'failed': 0,
        'total_bytes': 0
    }

    failed_videos = []
    start_time = time.time()

    print("🚀 Starting parallel download...\n")

    # Download with ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all download tasks
        future_to_video = {
            executor.submit(download_single_video, video, client, bucket_name, save_dir): video
            for video in video_list
        }

        # Process results with progress bar
        with tqdm(total=len(video_list), desc="Downloading", unit="video") as pbar:
            for future in as_completed(future_to_video):
                result = future.result()

                # Update counters
                status = result['status']
                if status == 'success':
                    results['success'] += 1
                    results['total_bytes'] += result.get('size', 0)
                elif status == 'exists':
                    results['exists'] += 1
                    results['total_bytes'] += result.get('size', 0)
                else:
                    results['failed'] += 1
                    failed_videos.append({
                        'video': result['blob'],
                        'error': result.get('error', 'Unknown')
                    })

                # Update progress bar
                pbar.update(1)

                # Calculate stats
                elapsed = time.time() - start_time
                total_processed = results['success'] + results['exists']
                rate = total_processed / (elapsed / 3600) if elapsed > 0 else 0
                downloaded_gb = results['total_bytes'] / (1024**3)

                pbar.set_postfix({
                    'new': results['success'],
                    'exists': results['exists'],
                    'failed': results['failed'],
                    'rate': f"{rate:.0f}/hr",
                    'GB': f"{downloaded_gb:.1f}"
                })

    # Final summary
    elapsed_hours = (time.time() - start_time) / 3600
    total_gb = results['total_bytes'] / (1024**3)

    print(f"\n{'='*70}")
    print(f"🎉 DOWNLOAD COMPLETE!")
    print(f"{'='*70}")
    print(f"✅ Newly downloaded: {results['success']:,} videos")
    print(f"📁 Already existed: {results['exists']:,} videos")
    print(f"❌ Failed: {results['failed']:,} videos")
    print(f"💾 Total size: {total_gb:.1f} GB")
    print(f"⏱️  Time: {elapsed_hours:.2f} hours")

    if total_processed > 0:
        print(f"📊 Average speed: {total_processed / elapsed_hours:.0f} videos/hour")
        print(f"💾 Download speed: {total_gb / elapsed_hours:.1f} GB/hour")

    print(f"{'='*70}\n")

    # Save failed videos list if any
    if failed_videos:
        failed_df = pd.DataFrame(failed_videos)
        failed_path = os.path.join(save_dir, 'failed_downloads.csv')
        failed_df.to_csv(failed_path, index=False)
        print(f"⚠️  Saved {len(failed_videos)} failed videos to: {failed_path}\n")

    print(f"✅ Videos saved to: {save_dir}")
    print(f"   Organized by camera: normanniles1/, normanniles2/, etc.\n")

    return results

# ============================================================================
# USAGE: Replace your download loop with this
# ============================================================================

# Get all video paths from train dataframe
video_list = train['videos'].unique().tolist()

print(f"📋 Found {len(video_list):,} unique videos in Train.csv\n")

# Run bulk download
results = bulk_download_parallel(
    video_list=video_list,
    client=client,
    bucket_name=bucket_name,
    save_dir='/content/drive/MyDrive/videos',  # Change if needed
    max_workers=20  # Adjust if needed
)

print("\n🎉 Done! Now you can process videos from Drive (much faster!)")
