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
from eyetrax.calibration.nine_point import run_9_point_calibration
from eyetrax.filters import KalmanSmoother, make_kalman
import threading
import time
from pathlib import Path

class EyeTraxService:
    def __init__(self, model_name='ridge', use_kalman=True, model_alpha=1.0):
        """
        Initialize EyeTrax service - uses native EyeTrax calibration
        
        Args:
            model_name: 'ridge', 'elastic_net', 'svr', or 'tiny_mlp'
            use_kalman: Whether to apply Kalman smoothing (reduces jitter)
            model_alpha: Ridge regularization strength (lower = less regularization)
        """
        # Initialize gaze estimator with specified model
        model_kwargs = {'alpha': model_alpha} if model_name == 'ridge' else {}
        self.estimator = GazeEstimator(
            model_name=model_name,
            model_kwargs=model_kwargs,
            ear_history_len=50,      # Blink detection history
            blink_threshold_ratio=0.8,
            min_history=15
        )
        
        self.cap = None
        self.is_tracking = False
        self.camera_id = 0
        
        # Kalman filter for smooth tracking (initialized after calibration)
        self.use_kalman = use_kalman
        self.smoother = None
        
        # Model info
        self.model_name = model_name
        self.is_calibrated = False
        
    def log(self, message):
        """Log to stderr so it doesn't interfere with stdout JSON"""
        print(f"[EyeTrax] {message}", file=sys.stderr, flush=True)
        
    def send_response(self, response):
        """Send JSON response to stdout"""
        print(json.dumps(response), flush=True)
        
    def run_calibration(self, camera_id=0):
        """
        Run EyeTrax's native 9-point calibration with fullscreen UI
        This is a blocking operation that returns when calibration completes
        """
        try:
            self.log("🎯 Starting native EyeTrax calibration...")
            self.log("Follow the green targets with your eyes")
            
            # Store camera ID for later tracking
            self.camera_id = camera_id
            
            # Flush any pending output before starting blocking operation
            sys.stdout.flush()
            sys.stderr.flush()
            
            # Run EyeTrax's native calibration (blocking call)
            # This handles everything: camera, UI, sample collection, training
            self.log("📸 Running calibration (this will take ~20-30 seconds)...")
            run_9_point_calibration(self.estimator, camera_index=camera_id)
            
            self.log("✅ Calibration complete!")
            self.is_calibrated = True
            self.log(f"🔵 is_calibrated set to: {self.is_calibrated}")
            
            # Initialize Kalman smoother if enabled
            if self.use_kalman:
                kf = make_kalman(
                    state_dim=4,           # [x, y, vx, vy]
                    meas_dim=2,            # [x, y]
                    dt=0.05,               # 20 FPS tracking
                    process_var=50.0,      # Allow natural movements
                    measurement_var=10.0,  # Trust trained model
                )
                self.smoother = KalmanSmoother(kf=kf)
                self.log("✨ Kalman smoothing enabled")
            
            self.log("📤 Sending calibration success response...")
            result = {
                "success": True,
                "message": "Calibration completed successfully",
                "model": self.model_name,
                "kalman_enabled": self.use_kalman,
                "is_calibrated": True,
            }
            self.log(f"Response: {result}")
            return result
            
        except KeyboardInterrupt:
            self.log("⚠️ Calibration interrupted by user (ESC key)")
            return {"success": False, "error": "Calibration cancelled by user"}
        except Exception as e:
            self.log(f"❌ Calibration error: {e}")
            import traceback
            self.log(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    def start_camera(self, camera_id=0):
        """Initialize camera for tracking (after calibration)"""
        try:
            if self.cap is not None and self.cap.isOpened():
                self.log("Camera already open")
                return {"success": True}
            
            if self.cap is not None:
                self.cap.release()
            
            self.cap = cv2.VideoCapture(camera_id)
            if not self.cap.isOpened():
                return {"success": False, "error": "Could not open camera"}
            
            # Set camera properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.log("📹 Camera initialized for tracking")
            return {"success": True}
            
        except Exception as e:
            self.log(f"Error starting camera: {e}")
            return {"success": False, "error": str(e)}
    
    def start_tracking(self):
        """Start gaze tracking loop (after calibration)"""
        self.log(f"🔍 start_tracking called. is_calibrated={self.is_calibrated}, is_tracking={self.is_tracking}")
        
        if not self.is_calibrated:
            self.log(f"❌ Cannot start tracking: is_calibrated={self.is_calibrated}")
            return {"success": False, "error": "Must calibrate first. Run 'run_calibration' command."}
        
        if self.is_tracking:
            self.log("⚠️ Already tracking")
            return {"success": True, "message": "Already tracking"}
        
        # Open camera for tracking
        self.log(f"📹 Opening camera {self.camera_id} for tracking...")
        camera_result = self.start_camera(self.camera_id)
        if not camera_result["success"]:
            self.log(f"❌ Camera failed: {camera_result.get('error')}")
            return camera_result
        
        self.is_tracking = True
        self.log("🎯 Starting gaze tracking...")
        
        # Start tracking thread
        threading.Thread(target=self._tracking_loop, daemon=True).start()
        
        self.log("✅ Tracking started successfully")
        return {"success": True}
    
    def stop_tracking(self):
        """Stop gaze tracking"""
        self.is_tracking = False
        self.log("Tracking stopped")
        return {"success": True}
    
    def clear_calibration(self):
        """Clear calibration (allows recalibrating)"""
        self.is_calibrated = False
        self.smoother = None
        self.log("Calibration cleared")
        return {"success": True}
    
    def save_model(self, filepath="flowsync_gaze_model.pkl"):
        """Save trained model to disk"""
        try:
            if not self.is_calibrated:
                return {"success": False, "error": "No trained model to save"}
            
            save_path = Path(filepath)
            self.estimator.save_model(save_path)
            
            self.log(f"💾 Model saved to {save_path}")
            return {
                "success": True,
                "path": str(save_path),
            }
        except Exception as e:
            self.log(f"Error saving model: {e}")
            return {"success": False, "error": str(e)}
    
    def load_model(self, filepath="flowsync_gaze_model.pkl"):
        """Load trained model from disk (skip calibration!)"""
        try:
            load_path = Path(filepath)
            if not load_path.exists():
                return {"success": False, "error": f"Model file not found: {filepath}"}
            
            self.estimator.load_model(load_path)
            self.is_calibrated = True
            
            # Initialize Kalman if enabled
            if self.use_kalman:
                kf = make_kalman(
                    state_dim=4, meas_dim=2, dt=0.05,
                    process_var=50.0, measurement_var=10.0,
                )
                self.smoother = KalmanSmoother(kf=kf)
            
            self.log(f"📂 Model loaded from {load_path}")
            return {
                "success": True,
                "path": str(load_path),
                "message": "Model loaded. Start tracking now!"
            }
        except Exception as e:
            self.log(f"Error loading model: {e}")
            return {"success": False, "error": str(e)}
    
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
            
            # Check if model is calibrated
            if not self.is_calibrated:
                return {"success": True, "gaze": None, "blink": False, "no_face": False, "not_calibrated": True}
            
            try:
                # Predict gaze from features
                gaze = self.estimator.predict([features])[0]
                raw_x, raw_y = float(gaze[0]), float(gaze[1])
                
                # Apply Kalman smoothing if enabled
                if self.smoother is not None:
                    x, y = self.smoother.step(int(raw_x), int(raw_y))
                    x, y = float(x), float(y)
                else:
                    x, y = raw_x, raw_y
                
                return {
                    "success": True,
                    "gaze": {"x": x, "y": y},
                    "blink": False,
                    "no_face": False,
                    "raw_gaze": {"x": raw_x, "y": raw_y} if self.smoother else None
                }
            except Exception as pred_error:
                self.log(f"Prediction error (model may not be trained): {pred_error}")
                return {"success": True, "gaze": None, "blink": False, "no_face": False, "not_calibrated": True}
            
        except Exception as e:
            self.log(f"Error getting gaze: {e}")
            return {"success": False, "error": str(e)}
    
    def _tracking_loop(self):
        """Continuous tracking loop that pushes gaze data"""
        self.log(f"Tracking loop started. Calibrated: {self.is_calibrated}")
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
        
        if command == "run_calibration":
            camera_id = cmd.get("camera_id", 0)
            self.log(f"📋 Handling run_calibration (camera_id={camera_id})")
            result = self.run_calibration(camera_id)
            self.log(f"📋 run_calibration result: success={result.get('success')}, is_calibrated={self.is_calibrated}")
            return result
        
        elif command == "start_tracking":
            self.log(f"📋 Handling start_tracking (is_calibrated={self.is_calibrated})")
            result = self.start_tracking()
            self.log(f"📋 start_tracking result: success={result.get('success')}")
            return result
        
        elif command == "stop_tracking":
            return self.stop_tracking()
        
        elif command == "clear_calibration":
            return self.clear_calibration()
        
        elif command == "get_gaze":
            return self.get_gaze()
        
        elif command == "save_model":
            filepath = cmd.get("filepath", "flowsync_gaze_model.pkl")
            return self.save_model(filepath)
        
        elif command == "load_model":
            filepath = cmd.get("filepath", "flowsync_gaze_model.pkl")
            return self.load_model(filepath)
        
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
                    self.log(f"📥 Received command: {cmd.get('command')} (id: {cmd.get('request_id')})")
                    
                    response = self.handle_command(cmd)
                    response["type"] = "response"
                    response["request_id"] = cmd.get("request_id")
                    
                    self.log(f"📤 Sending response for {cmd.get('command')}: {response.get('success')}")
                    self.send_response(response)
                    
                    # Flush output to ensure response is sent immediately
                    sys.stdout.flush()
                    
                except json.JSONDecodeError as e:
                    self.log(f"Invalid JSON: {e}")
                    self.send_response({
                        "type": "error",
                        "error": f"Invalid JSON: {str(e)}"
                    })
                except Exception as e:
                    self.log(f"Error handling command: {e}")
                    import traceback
                    self.log(traceback.format_exc())
                    self.send_response({
                        "type": "error",
                        "error": str(e),
                        "request_id": cmd.get("request_id") if 'cmd' in locals() else None
                    })
        
        finally:
            if self.cap:
                self.cap.release()
            self.log("EyeTrax Service stopped")

if __name__ == "__main__":
    service = EyeTraxService()
    service.run()

