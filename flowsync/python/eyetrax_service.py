#!/usr/bin/env python3
"""
EyeTrax Service for FlowSync
Communicates via JSON over stdin/stdout
"""

import sys
import json
import cv2
import numpy as np
from eyetrax import GazeEstimator
import threading
import time

class EyeTraxService:
    def __init__(self):
        self.estimator = GazeEstimator()
        self.cap = None
        self.is_tracking = False
        self.is_calibrating = False
        self.calibration_points = []
        self.target_calibration_points = []
        
    def log(self, message):
        """Log to stderr so it doesn't interfere with stdout JSON"""
        print(f"[EyeTrax] {message}", file=sys.stderr, flush=True)
        
    def send_response(self, response):
        """Send JSON response to stdout"""
        print(json.dumps(response), flush=True)
        
    def start_camera(self, camera_id=0):
        """Initialize camera (idempotent - safe to call multiple times)"""
        try:
            # If camera is already open and working, don't reopen it
            if self.cap is not None and self.cap.isOpened():
                self.log("Camera already initialized, skipping")
                return {"success": True, "message": "Camera already open"}
            
            # Release old camera if it exists but isn't opened
            if self.cap is not None:
                self.cap.release()
            
            self.cap = cv2.VideoCapture(camera_id)
            if not self.cap.isOpened():
                return {"success": False, "error": "Could not open camera"}
            
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.log("Camera initialized successfully")
            return {"success": True}
        except Exception as e:
            self.log(f"Error starting camera: {e}")
            return {"success": False, "error": str(e)}
    
    def start_tracking(self):
        """Start gaze tracking loop (call this AFTER calibration)"""
        if self.cap is None:
            return {"success": False, "error": "Camera not initialized"}
        
        if self.is_tracking:
            return {"success": True, "message": "Already tracking"}
        
        self.is_tracking = True
        self.log("Tracking loop starting...")
        
        # Start tracking thread
        threading.Thread(target=self._tracking_loop, daemon=True).start()
        
        return {"success": True}
    
    def stop_tracking(self):
        """Stop gaze tracking"""
        self.is_tracking = False
        self.log("Tracking stopped")
        return {"success": True}
    
    def add_calibration_point(self, screen_x, screen_y, duration=1.0):
        """
        Add a calibration point by collecting ALL non-blink frames during duration
        This matches EyeTrax's original capture phase behavior
        """
        try:
            if self.cap is None:
                return {"success": False, "error": "Camera not initialized"}
            
            start_time = time.time()
            samples_collected = 0
            
            # Collect ALL valid frames during the duration (like EyeTrax)
            while time.time() - start_time < duration:
                ret, frame = self.cap.read()
                if not ret:
                    time.sleep(0.01)  # Brief pause on failure
                    continue
                
                features, blink = self.estimator.extract_features(frame)
                
                # Only use non-blink samples with valid face detection (EyeTrax method)
                if features is not None and not blink:
                    self.calibration_points.append(features)
                    self.target_calibration_points.append([screen_x, screen_y])
                    samples_collected += 1
                
                # No artificial delay - just collect as fast as camera provides
                time.sleep(0.001)  # Minimal sleep to prevent CPU spinning
            
            if samples_collected < 5:  # Need at least a few samples
                return {"success": False, "error": f"Only collected {samples_collected} samples (need at least 5)"}
            
            total_count = len(self.calibration_points)
            self.log(f"Calibration point added: ({screen_x:.0f}, {screen_y:.0f}) with {samples_collected} samples (total: {total_count})")
            
            # Return unique point count (not total sample count)
            unique_points = len(set(tuple(pt) for pt in self.target_calibration_points))
            return {"success": True, "count": unique_points, "samples": samples_collected}
            
        except Exception as e:
            self.log(f"Error adding calibration point: {e}")
            return {"success": False, "error": str(e)}
    
    def train_model(self):
        """Train the gaze estimation model"""
        try:
            if len(self.calibration_points) < 5:
                return {"success": False, "error": f"Need at least 5 calibration points, got {len(self.calibration_points)}"}
            
            # Train the model with collected calibration data
            X = np.array(self.calibration_points)
            y = np.array(self.target_calibration_points)
            
            # EyeTrax uses .train() not .fit()
            self.estimator.train(X, y)
            
            self.log(f"Model trained with {len(self.calibration_points)} points")
            return {"success": True, "points": len(self.calibration_points)}
            
        except Exception as e:
            self.log(f"Error training model: {e}")
            return {"success": False, "error": str(e)}
    
    def clear_calibration(self):
        """Clear calibration data"""
        self.calibration_points = []
        self.target_calibration_points = []
        self.log("Calibration data cleared")
        return {"success": True}
    
    def get_gaze(self):
        """Get current gaze coordinates"""
        try:
            if self.cap is None:
                return {"success": False, "error": "Camera not initialized"}
            
            ret, frame = self.cap.read()
            if not ret:
                return {"success": False, "error": "Could not read frame"}
            
            features, blink = self.estimator.extract_features(frame)
            
            if features is None:
                return {"success": True, "gaze": None, "blink": False, "no_face": True}
            
            if blink:
                return {"success": True, "gaze": None, "blink": True, "no_face": False}
            
            # Check if model is trained by seeing if we have calibration data
            if len(self.calibration_points) < 5:
                return {"success": True, "gaze": None, "blink": False, "no_face": False, "not_calibrated": True}
            
            try:
                # Try to predict gaze
                gaze = self.estimator.predict([features])[0]
                x, y = float(gaze[0]), float(gaze[1])
                
                return {"success": True, "gaze": {"x": x, "y": y}, "blink": False, "no_face": False}
            except Exception as pred_error:
                self.log(f"Prediction error (model may not be trained): {pred_error}")
                return {"success": True, "gaze": None, "blink": False, "no_face": False, "not_calibrated": True}
            
        except Exception as e:
            self.log(f"Error getting gaze: {e}")
            return {"success": False, "error": str(e)}
    
    def _tracking_loop(self):
        """Continuous tracking loop that pushes gaze data"""
        self.log(f"Tracking loop started. Calibration points: {len(self.calibration_points)}")
        frame_count = 0
        error_count = 0
        max_consecutive_errors = 5
        
        while self.is_tracking:
            result = self.get_gaze()
            frame_count += 1
            
            # Track consecutive errors
            if not result.get("success"):
                error_count += 1
                if frame_count <= 20 or error_count <= max_consecutive_errors:
                    self.log(f"Frame {frame_count} error: {result.get('error')}")
                
                # Stop if too many consecutive errors
                if error_count >= max_consecutive_errors:
                    self.log(f"⚠️ Stopping tracking: {max_consecutive_errors} consecutive frame errors")
                    self.is_tracking = False
                    break
            else:
                error_count = 0  # Reset on success
                
                # Log first 3 frames and every 50 frames after
                if frame_count <= 3 or frame_count % 50 == 0:
                    gaze_str = "null"
                    if result.get("gaze"):
                        gaze_str = f"({result['gaze']['x']:.0f}, {result['gaze']['y']:.0f})"
                    self.log(f"Frame {frame_count}: gaze={gaze_str}, blink={result.get('blink', False)}, no_face={result.get('no_face', False)}")
                
                # Send gaze update
                self.send_response({
                    "type": "gaze_update",
                    "data": result
                })
            
            time.sleep(0.05)  # 20 FPS
        
        self.log("Tracking loop stopped")
    
    def handle_command(self, cmd):
        """Handle incoming command"""
        command = cmd.get("command")
        
        if command == "start_camera":
            camera_id = cmd.get("camera_id", 0)
            return self.start_camera(camera_id)
        
        elif command == "start_tracking":
            return self.start_tracking()
        
        elif command == "stop_tracking":
            return self.stop_tracking()
        
        elif command == "add_calibration_point":
            screen_x = cmd.get("screen_x")
            screen_y = cmd.get("screen_y")
            if screen_x is None or screen_y is None:
                return {"success": False, "error": "Missing screen_x or screen_y"}
            return self.add_calibration_point(screen_x, screen_y)
        
        elif command == "train_model":
            return self.train_model()
        
        elif command == "clear_calibration":
            return self.clear_calibration()
        
        elif command == "get_gaze":
            return self.get_gaze()
        
        elif command == "ping":
            return {"success": True, "message": "pong"}
        
        else:
            return {"success": False, "error": f"Unknown command: {command}"}
    
    def run(self):
        """Main event loop - read commands from stdin"""
        self.log("EyeTrax Service started")
        self.send_response({"type": "ready"})
        
        try:
            for line in sys.stdin:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    cmd = json.loads(line)
                    response = self.handle_command(cmd)
                    response["type"] = "response"
                    response["request_id"] = cmd.get("request_id")
                    self.send_response(response)
                    
                except json.JSONDecodeError as e:
                    self.log(f"Invalid JSON: {e}")
                    self.send_response({
                        "type": "error",
                        "error": f"Invalid JSON: {str(e)}"
                    })
                except Exception as e:
                    self.log(f"Error handling command: {e}")
                    self.send_response({
                        "type": "error",
                        "error": str(e)
                    })
        
        finally:
            if self.cap:
                self.cap.release()
            self.log("EyeTrax Service stopped")

if __name__ == "__main__":
    service = EyeTraxService()
    service.run()

