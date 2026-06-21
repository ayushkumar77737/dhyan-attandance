import axios from "axios";

export const uploadProfileImage = async (file, employeeId, name) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "user_profile");

    formData.append(
        "public_id",
        `${employeeId}_${name.replace(/\s+/g, "_")}`
    );

    const response = await axios.post(
        "https://api.cloudinary.com/v1_1/dgvjq9bhl/image/upload",
        formData
    );

    return response.data.secure_url;
};