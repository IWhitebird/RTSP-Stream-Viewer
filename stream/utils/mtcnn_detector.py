import cv2
from mtcnn_cv2 import MTCNN as MTCNN_CV2_Lib
import PIL
import PIL.Image as Image
import io
import numpy as np
import logging

logger = logging.getLogger(__name__)

class MTCNNDetector:
    def __init__(self):
        """
            Initialize the detector once per instance of this class
            This ensures that if multiple RTSPClient instances are created,
            each has its own MTCNN detector, which can help with thread safety
            if the underlying DNN models are not fully re-entrant.
        """
        try:
            self.detector = MTCNN_CV2_Lib()
            logger.info("MTCNN detector initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize MTCNN detector: {e}", exc_info=True)
            self.detector = None

    def detect_faces(self, image_bytes):
        if not self.detector:
            logger.warning("MTCNN detector not initialized, skipping face detection.")
            return image_bytes, False
            
        if not image_bytes or len(image_bytes) < 100: # Basic check
            logger.warning("detect_faces received empty or too small image_bytes.")
            return image_bytes, False

        try:
            # Convert bytes to PIL Image
            try:
                image_pil = Image.open(io.BytesIO(image_bytes))
            except PIL.UnidentifiedImageError:
                logger.error("Failed to identify image from bytes (corrupted JPEG?).")
                return image_bytes, False
            
            # Convert PIL Image to numpy array MTCNN_CV2 expects RGB.
            image_array_rgb = np.array(image_pil)

            # Ensure the image array is not empty and has 3 dimensions (H, W, C)
            if image_array_rgb.size == 0 or image_array_rgb.ndim != 3:
                logger.error(f"Invalid image array shape after PIL conversion: {image_array_rgb.shape if hasattr(image_array_rgb, 'shape') else 'None'}")
                return image_bytes, False

            # Handle grayscale or RGBA images explicitly
            if image_array_rgb.shape[2] == 1: # Grayscale (though JPEGs are usually 3-channel)
                image_array_rgb = cv2.cvtColor(image_array_rgb, cv2.COLOR_GRAY2RGB)
            elif image_array_rgb.shape[2] == 4: # RGBA
                image_array_rgb = cv2.cvtColor(image_array_rgb, cv2.COLOR_RGBA2RGB)
            
            # Crucial: Ensure the image is contiguous and has the correct data type
            if image_array_rgb.dtype != np.uint8:
                 image_array_rgb = image_array_rgb.astype(np.uint8)
            
            # Ensure the array is C-contiguous, OpenCV sometimes requires this.
            if not image_array_rgb.flags['C_CONTIGUOUS']:
                image_array_rgb = np.ascontiguousarray(image_array_rgb, dtype=np.uint8)

            # Defensive check for empty image after conversions
            if image_array_rgb.shape[0] == 0 or image_array_rgb.shape[1] == 0:
                logger.error(f"Image became empty after conversions. Original shape from PIL: {np.array(image_pil).shape}")
                return image_bytes, False

            # MTCNN expects RGB format, which image_array_rgb should be.
            result = self.detector.detect_faces(image_array_rgb)
            
            for face in result:
                bounding_box = face['box']
                # keypoints = face['keypoints']
                confidence = face['confidence']
                # threshold 
                if confidence > 0.7: 
                    x, y, w, h = bounding_box
                    cv2.rectangle(image_array_rgb, (x, y), (x + w, y + h), (0, 255, 0), 2)
                    cv2.putText(image_array_rgb, f'{confidence:.2f}', 
                              (x, y - 10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            # Convert back to PIL Image (from RGB numpy array)
            modified_image_pil = Image.fromarray(image_array_rgb)
            
            # Convert to bytes (JPEG format)
            img_byte_arr = io.BytesIO()
            modified_image_pil.save(img_byte_arr, format='JPEG', quality=85)
            
            return img_byte_arr.getvalue(), True
            
        except cv2.error as e:
            logger.error(f"OpenCV error in face detection: {str(e)}. Image shape: {image_array_rgb.shape if 'image_array_rgb' in locals() else 'N/A'}, dtype: {image_array_rgb.dtype if 'image_array_rgb' in locals() else 'N/A'}", exc_info=True)
            return image_bytes, False
        except Exception as e:
            logger.error(f"Generic error in face detection: {str(e)}. Image shape: {image_array_rgb.shape if 'image_array_rgb' in locals() else 'N/A'}, dtype: {image_array_rgb.dtype if 'image_array_rgb' in locals() else 'N/A'}", exc_info=True)
            return image_bytes, False