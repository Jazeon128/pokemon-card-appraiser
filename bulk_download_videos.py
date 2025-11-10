"""
Bulk Download Videos to Google Drive (for Colab)
================================================
Run this ONCE to download all videos to your mounted Google Drive.
Then modify your processing notebook to read from Drive instead.

Expected time: 2-4 hours for 13k videos (with 10 parallel workers)
"""

import os
import requests
from requests.adapters import HTTPAdapter, Retry
from urllib.parse import quote
from pathlib import Path
from tqdm import tqdm
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Configuration
BUCKET_NAME = 'brb-traffic'
BASE_URL = f'https://storage.googleapis.com/{BUCKET_NAME}/'
SAVE_DIR = '/content/drive/MyDrive/barbados_traffic/videos'  # Adjust path as needed
MAX_WORKERS = 10  # Parallel downloads
RETRY_ATTEMPTS = 3

def build_session():
    """Create robust requests session with retries."""
    retries = Retry(
        total=5,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "HEAD"]
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"User-Agent": "barbados-traffic-downloader/1.0"})
    return session

def download_single_video(video_name, session, save_dir=SAVE_DIR):
    """Download a single video with retry logic."""
    filename = Path(video_name).name
    camera_name = filename.split('_')[0]

    # Create camera subfolder
    camera_dir = os.path.join(save_dir, camera_name)
    os.makedirs(camera_dir, exist_ok=True)

    save_path = os.path.join(camera_dir, filename)

    # Skip if already exists
    if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
        return {'video': video_name, 'status': 'exists', 'path': save_path}

    # Build URL
    gcs_path = f'{camera_name}/{filename}'
    url = f'{BASE_URL}{quote(gcs_path)}'

    for attempt in range(RETRY_ATTEMPTS):
        try:
            with session.get(url, stream=True, timeout=60) as response:
                response.raise_for_status()

                # Download with streaming
                with open(save_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=1024*1024):
                        if chunk:
                            f.write(chunk)

                # Verify file
                if os.path.exists(save_path) and os.path.getsize(save_path) > 0:
                    return {'video': video_name, 'status': 'success', 'path': save_path}
                else:
                    return {'video': video_name, 'status': 'failed', 'error': 'Empty file'}

        except Exception as e:
            if attempt == RETRY_ATTEMPTS - 1:
                return {'video': video_name, 'status': 'failed', 'error': str(e)}
            time.sleep(2 ** attempt)  # Exponential backoff

    return {'video': video_name, 'status': 'failed', 'error': 'Max retries exceeded'}

def bulk_download_parallel(video_list, max_workers=MAX_WORKERS):
    """Download videos in parallel with progress bar."""

    print(f"\n{'='*70}")
    print(f"📹 BULK VIDEO DOWNLOAD TO GOOGLE DRIVE")
    print(f"{'='*70}")
    print(f"Total videos: {len(video_list):,}")
    print(f"Save location: {SAVE_DIR}")
    print(f"Parallel workers: {max_workers}")
    print(f"{'='*70}\n")

    # Check existing videos
    existing_count = 0
    if os.path.exists(SAVE_DIR):
        for root, dirs, files in os.walk(SAVE_DIR):
            existing_count += len([f for f in files if f.endswith('.mp4')])

    print(f"📊 Found {existing_count:,} existing videos (will skip)")
    videos_to_download = len(video_list) - existing_count
    print(f"📥 Need to download: {videos_to_download:,} videos\n")

    if videos_to_download == 0:
        print("✅ All videos already downloaded!")
        return

    # Create sessions for each worker
    sessions = [build_session() for _ in range(max_workers)]

    results = {
        'success': 0,
        'exists': 0,
        'failed': 0,
        'failed_videos': []
    }

    start_time = time.time()

    # Download with ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_video = {
            executor.submit(download_single_video, video, sessions[i % max_workers]): video
            for i, video in enumerate(video_list)
        }

        # Process completed downloads with progress bar
        with tqdm(total=len(video_list), desc="Downloading", unit="video") as pbar:
            for future in as_completed(future_to_video):
                result = future.result()

                if result['status'] == 'success':
                    results['success'] += 1
                elif result['status'] == 'exists':
                    results['exists'] += 1
                else:
                    results['failed'] += 1
                    results['failed_videos'].append(result['video'])

                pbar.update(1)

                # Update description with stats
                elapsed = time.time() - start_time
                rate = (results['success'] + results['exists']) / (elapsed / 3600)
                pbar.set_postfix({
                    'success': results['success'],
                    'exists': results['exists'],
                    'failed': results['failed'],
                    'rate': f"{rate:.0f}/hr"
                })

    # Final report
    elapsed_hours = (time.time() - start_time) / 3600

    print(f"\n{'='*70}")
    print(f"🎉 DOWNLOAD COMPLETE!")
    print(f"{'='*70}")
    print(f"✅ Successfully downloaded: {results['success']:,}")
    print(f"📁 Already existed: {results['exists']:,}")
    print(f"❌ Failed: {results['failed']:,}")
    print(f"⏱️  Total time: {elapsed_hours:.2f} hours")
    print(f"📊 Average rate: {len(video_list) / elapsed_hours:.0f} videos/hour")
    print(f"{'='*70}\n")

    # Save failed videos list
    if results['failed'] > 0:
        failed_df = pd.DataFrame({'video_name': results['failed_videos']})
        failed_path = '/content/drive/MyDrive/barbados_traffic/failed_downloads.csv'
        failed_df.to_csv(failed_path, index=False)
        print(f"⚠️  Saved failed videos list to: {failed_path}\n")

    return results

def main():
    """Main execution function."""

    # Load video list from Train.csv
    train_csv = '/content/drive/MyDrive/barbados_traffic/data/Train.csv'

    print("📂 Loading video list from Train.csv...")
    train_df = pd.read_csv(train_csv)
    video_list = train_df['videos'].unique().tolist()

    print(f"✅ Found {len(video_list):,} unique videos\n")

    # Estimate storage
    avg_size_mb = 10  # Conservative estimate
    total_gb = (len(video_list) * avg_size_mb) / 1024
    print(f"💾 Estimated storage needed: ~{total_gb:.1f} GB")
    print(f"   (You have plenty of space in your 2 TB Drive!)\n")

    # Confirm before starting
    print("⚠️  This will take 2-4 hours. Press Ctrl+C to cancel.")
    print("Starting in 5 seconds...\n")
    time.sleep(5)

    # Start bulk download
    results = bulk_download_parallel(video_list)

    print("\n✅ All done! Now modify your processing notebook to read from Drive.")
    print(f"   Videos location: {SAVE_DIR}")

if __name__ == "__main__":
    main()
