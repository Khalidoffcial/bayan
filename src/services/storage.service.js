import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebaseStorage.service.js";

/**
 * Uploads an array of image files to Firebase Storage.
 * @param {File[]} images - Array of image files to upload.
 * @returns {Promise<string[]>} - Array of download URLs.
 */
export const uploadImages = async (images) => {
  if (!images || !images.length) return [];

  try {
    const uploadPromises = images.map(async (img, index) => {
      const uniqueId = `${Date.now()}_${index}_${img.name}`;
      const imgRef = storageRef(storage, `images/${uniqueId}`);
      await uploadBytes(imgRef, img);
      return await getDownloadURL(imgRef);
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("❌ Error uploading images:", error);
    return [];
  }
};
