#!/usr/bin/env python3
"""
Simple EyeTrax Demo - Standalone test to verify EyeTrax works correctly.
This uses the basic EyeTrax library without any Electron integration.

Usage: python test_eyetrax_demo.py
"""

import cv2
import numpy as np
from eyetrax import GazeEstimator, run_9_point_calibration

def show_calibration_point(screen_width, screen_height, x, y, duration_ms=2000):
    """Show a calibration point on screen for the user to look at"""
    # Create a white canvas
    img = np.ones((screen_height, screen_width, 3), dtype=np.uint8) * 255
    
    # Draw calibration point
    cv2.circle(img, (x, y), 30, (0, 0, 255), -1)  # Red filled circle
    cv2.circle(img, (x, y), 35, (0, 0, 0), 3)     # Black outline
    
    # Draw progress ring (optional)
    cv2.putText(img, f"Look at the red dot", 
                (screen_width // 2 - 150, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    cv2.imshow('Calibration', img)
    cv2.waitKey(duration_ms)

def main():
    print("=== EyeTrax Standalone Demo ===\n")
    
    # Initialize camera
    print("1. Opening camera...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Error: Could not open camera")
        return
    
    # Set camera properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    ret, test_frame = cap.read()
    if not ret:
        print("❌ Error: Could not read from camera")
        cap.release()
        return
    
    print(f"✅ Camera opened: {test_frame.shape[1]}x{test_frame.shape[0]}")
    
    # Initialize EyeTrax
    print("\n2. Initializing EyeTrax...")
    tracker = EyeTracker()
    print("✅ EyeTrax initialized")
    
    # Get screen dimensions
    screen_width = 1920  # Adjust to your screen
    screen_height = 1080  # Adjust to your screen
    
    # Define 9-point calibration grid (same as our app)
    margin_x = int(screen_width * 0.1)
    margin_y = int(screen_height * 0.1)
    
    calibration_points = [
        # Center first
        (screen_width // 2, screen_height // 2),
        # Corners
        (margin_x, margin_y),
        (screen_width - margin_x, margin_y),
        (screen_width - margin_x, screen_height - margin_y),
        (margin_x, screen_height - margin_y),
        # Edges
        (screen_width // 2, margin_y),
        (screen_width - margin_x, screen_height // 2),
        (screen_width // 2, screen_height - margin_y),
        (margin_x, screen_height // 2),
    ]
    
    # Calibration phase
    print(f"\n3. Starting calibration ({len(calibration_points)} points)...")
    print("   Look at each red dot when it appears.\n")
    
    cv2.namedWindow('Calibration', cv2.WND_PROP_FULLSCREEN)
    cv2.setWindowProperty('Calibration', cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    
    X_calibration = []
    y_calibration = []
    
    for i, (x, y) in enumerate(calibration_points):
        print(f"   Point {i+1}/{len(calibration_points)}: ({x}, {y})")
        
        # Show calibration point
        show_calibration_point(screen_width, screen_height, x, y, duration_ms=500)
        
        # Collect samples while showing the point
        samples = []
        for sample_num in range(15):  # 15 samples per point
            ret, frame = cap.read()
            if not ret:
                continue
            
            features, blink = tracker.extract_features(frame)
            
            if features is not None and not blink:
                X_calibration.append(features)
                y_calibration.append([x, y])
                samples.append(features)
        
        print(f"      → Collected {len(samples)} samples")
    
    cv2.destroyWindow('Calibration')
    
    print(f"\n✅ Calibration complete: {len(X_calibration)} total samples")
    
    # Train model
    print("\n4. Training model...")
    X = np.array(X_calibration)
    y = np.array(y_calibration)
    
    tracker.train(X, y)
    print(f"✅ Model trained with {len(X)} samples")
    
    # Tracking phase
    print("\n5. Starting gaze tracking...")
    print("   Press 'q' to quit\n")
    
    cv2.namedWindow('Gaze Tracking', cv2.WINDOW_NORMAL)
    cv2.resizeWindow('Gaze Tracking', 1280, 720)
    
    frame_count = 0
    gaze_history = []
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Failed to read frame")
            break
        
        frame_count += 1
        
        # Extract features and predict gaze
        features, blink = tracker.extract_features(frame)
        
        if features is not None and not blink:
            gaze = tracker.predict(features)
            gaze_x, gaze_y = int(gaze[0]), int(gaze[1])
            
            # Keep history for smoothing
            gaze_history.append((gaze_x, gaze_y))
            if len(gaze_history) > 5:
                gaze_history.pop(0)
            
            # Display info
            if frame_count % 30 == 0:  # Every 30 frames
                avg_x = int(np.mean([g[0] for g in gaze_history]))
                avg_y = int(np.mean([g[1] for g in gaze_history]))
                print(f"   Frame {frame_count}: Gaze = ({avg_x}, {avg_y})")
            
            # Draw gaze point on frame (scaled to frame size)
            scale_x = frame.shape[1] / screen_width
            scale_y = frame.shape[0] / screen_height
            
            draw_x = int(gaze_x * scale_x)
            draw_y = int(gaze_y * scale_y)
            
            # Draw gaze indicator
            cv2.circle(frame, (draw_x, draw_y), 15, (0, 255, 0), 2)
            cv2.circle(frame, (draw_x, draw_y), 3, (0, 255, 0), -1)
            
            # Draw text
            cv2.putText(frame, f"Gaze: ({gaze_x}, {gaze_y})",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(frame, "Press 'q' to quit",
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        elif blink:
            cv2.putText(frame, "BLINK DETECTED",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        else:
            cv2.putText(frame, "NO FACE DETECTED",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        
        cv2.imshow('Gaze Tracking', frame)
        
        # Check for quit
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
    
    # Cleanup
    print("\n6. Cleaning up...")
    cap.release()
    cv2.destroyAllWindows()
    print("✅ Demo complete!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Demo interrupted by user")
        cv2.destroyAllWindows()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        cv2.destroyAllWindows()

