"""
Modified Video Processing - Read from Google Drive
===================================================
Use this code to replace Step 10 in your notebook.
Reads videos directly from Drive (much faster!)

BEFORE running this, make sure you've run bulk_download_videos.py first!
"""

import os
import pandas as pd
import numpy as np
import cv2
from pathlib import Path
from tqdm import tqdm
from ultralytics import YOLO
import gc
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

# Video location on Drive (where bulk_download_videos.py saved them)
VIDEOS_DIR = '/content/drive/MyDrive/barbados_traffic/videos'

# Processing settings
BATCH_SIZE = 100
FRAME_SKIP = 10
CONF_THRESHOLD = 0.30

# ============================================================================
# MODIFIED PROCESSING LOOP (No downloads needed!)
# ============================================================================

def get_video_path_from_drive(video_name):
    """Get the local path to video in Drive."""
    filename = Path(video_name).name
    camera_name = filename.split('_')[0]
    video_path = os.path.join(VIDEOS_DIR, camera_name, filename)

    if os.path.exists(video_path):
        return video_path
    else:
        return None

# Load existing progress
existing_features_df, already_processed = load_existing_features()

videos_to_process = video_files[:TOTAL_VIDEOS]

# Filter out already-processed
videos_remaining = []
for video_name in videos_to_process:
    filename = Path(video_name).name
    if filename not in already_processed:
        videos_remaining.append(video_name)

print(f"\n{'='*60}")
print(f"📹 VIDEO PROCESSING (READING FROM DRIVE - SUPER FAST!)")
print(f"{'='*60}")
print(f"Total videos: {len(video_files):,}")
print(f"Already processed: {len(already_processed):,}")
print(f"Remaining: {len(videos_remaining):,}")
print(f"\n⚡ SPEED BOOST:")
print(f"   ✅ No network downloads!")
print(f"   ✅ Reading from local Drive (instant)")
print(f"   ✅ GPU processing only")
print(f"   📊 Expected: 600-800 videos/hour (vs 400 before)")
print(f"   ⏱️  Estimated time: {len(videos_remaining) / 700:.1f} hours")
print(f"{'='*60}\n")

if len(videos_remaining) == 0:
    print("✅ All videos already processed!")
else:
    # Initialize with existing data
    if len(existing_features_df) > 0:
        all_features = existing_features_df.to_dict('records')
    else:
        all_features = []

    overall_start = time.time()

    # Process in batches
    for batch_num in range(0, len(videos_remaining), BATCH_SIZE):
        batch_videos = videos_remaining[batch_num:batch_num + BATCH_SIZE]
        batch_id = batch_num // BATCH_SIZE + 1
        batch_start = time.time()

        print(f"\n{'='*60}")
        print(f"🔄 BATCH {batch_id}: Processing {len(batch_videos)} videos")
        print(f"   Progress: {len(already_processed) + batch_num}/{len(video_files)}")
        print(f"{'='*60}\n")

        # Get video paths from Drive (instant!)
        print(f"📂 Loading videos from Drive...")
        video_paths = []
        missing_count = 0

        for video_name in batch_videos:
            path = get_video_path_from_drive(video_name)
            if path:
                video_paths.append(path)
            else:
                missing_count += 1

        print(f"✅ Found {len(video_paths)} videos")
        if missing_count > 0:
            print(f"⚠️  {missing_count} videos not found in Drive")
        print()

        if len(video_paths) == 0:
            continue

        # Extract features (GPU only - no download delays!)
        print(f"🤖 Extracting features with GPU...")
        batch_features = []

        for video_path in tqdm(video_paths, desc="Processing"):
            features = extract_video_features(video_path, model,
                                              frame_skip=FRAME_SKIP,
                                              conf_threshold=CONF_THRESHOLD)
            batch_features.append(features)

        all_features.extend(batch_features)
        print(f"✅ Extracted features from {len(batch_features)} videos\n")

        # Save intermediate
        temp_df = pd.DataFrame(all_features)
        temp_df.to_csv('data/video_features_temp.csv', index=False)
        print(f"💾 Saved intermediate ({len(all_features):,} total videos)\n")

        # Cleanup memory
        gc.collect()

        # Timing stats
        batch_time = (time.time() - batch_start) / 60
        overall_time = (time.time() - overall_start) / 60
        videos_processed_now = len(all_features) - len(already_processed)
        videos_per_hour = videos_processed_now / (overall_time / 60) if overall_time > 0 else 0
        remaining_videos = len(videos_remaining) - (batch_num + len(batch_videos))
        eta_hours = remaining_videos / videos_per_hour if videos_per_hour > 0 else 0

        print(f"⏱️  Batch {batch_id} complete: {batch_time:.1f} minutes")
        print(f"   Total progress: {len(all_features):,} / {len(video_files):,}")
        print(f"   Speed: {videos_per_hour:.0f} videos/hour 🚀")
        print(f"   Time remaining: {eta_hours:.1f} hours")
        print(f"\n{'='*60}\n")

    print(f"🎉 PROCESSING COMPLETE!")
    print(f"{'='*60}")
    print(f"Total videos: {len(all_features):,}")
    print(f"Total time: {(time.time() - overall_start) / 3600:.1f} hours")
    print(f"Average speed: {len(all_features) / ((time.time() - overall_start) / 3600):.0f} videos/hour")
    print(f"{'='*60}")
