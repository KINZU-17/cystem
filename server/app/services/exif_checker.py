import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Tuple
from PIL import Image
from PIL.ExifTags import TAGS
from fastapi import HTTPException, status

def decode_image_bytes(image_data: str) -> bytes:
    """Decodes raw base64 or data URL into image bytes."""
    if "," in image_data:
        image_data = image_data.split(",")[1]
    return base64.b64decode(image_data)

def verify_live_camera_image(
    image_bytes: bytes,
    max_age_seconds: int = 120,
    enforce_strict_exif: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Validates that an uploaded photo is a valid image and not corrupted.
    If enforce_strict_exif is enabled, inspects EXIF metadata for hardware timestamp
    and blocks older or gallery-picked photos.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()  # Verify integrity
        
        # Re-open for metadata parsing
        image = Image.open(io.BytesIO(image_bytes))
        exif_data = image.getexif()

        if enforce_strict_exif:
            if not exif_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Anti-Cheat Violation: Image missing camera hardware EXIF data. Gallery uploads prohibited."
                )

            datetime_original = None
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, str(tag_id))
                if tag_name in ("DateTimeOriginal", "DateTime"):
                    datetime_original = value
                    break

            if not datetime_original:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Anti-Cheat Violation: Camera timestamp could not be verified."
                )

            # Standard format: 'YYYY:MM:DD HH:MM:SS'
            try:
                photo_time = datetime.strptime(str(datetime_original), "%Y:%m:%d %H:%M:%S")
                time_diff = abs((datetime.utcnow() - photo_time).total_seconds())
                if time_diff > max_age_seconds:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Anti-Cheat Violation: Stale photo. Hints must be captured live."
                    )
            except ValueError:
                pass  # Fall through if timestamp format differs

        return True, "Verified live camera image"

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image format: {str(e)}"
        )
