import api from "@/utils/api";

function gIT(i) {
    return document.getElementById(i).value;
}

class FormManager {
    constructor(type) {
        this.apiUrl = `${import.meta.env.VITE_FORM_SUBMIT}`; // Read the API URL from the environment variable
        this.details = {};
        this.type = type;
        this.hasFiles = false;
    }

    setDetail(key, value) {
        // Check if the value is a File object or array of Files
        if (value instanceof File) {
            this.hasFiles = true;
            // If key already exists and is an array, append to it
            if (Array.isArray(this.details[key])) {
                this.details[key].push(value);
            } else if (this.details[key] instanceof File) {
                // Convert existing File to array and add new one
                this.details[key] = [this.details[key], value];
            } else {
                this.details[key] = value;
            }
        } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
            // Handle array of Files
            this.hasFiles = true;
            // If key already exists, merge arrays
            if (Array.isArray(this.details[key])) {
                this.details[key] = [...this.details[key], ...value];
            } else if (this.details[key] instanceof File) {
                this.details[key] = [this.details[key], ...value];
            } else {
                this.details[key] = value;
            }
        } else {
            this.details[key] = value; // Add form details as key-value pairs
        }
    }

    getDetail(key) {
        return this.details[key]; // Retrieve the details using the key
    }

    async submit(options = {}) {
        try {
            let requestData;
            let headers = {
                'X-Form-Type': this.type,
            };

            if (this.hasFiles) {
                // If we have files, use FormData
                requestData = new FormData();
                
                // Append all details to FormData
                Object.entries(this.details).forEach(([key, value]) => {
                    if (value instanceof File) {
                        requestData.append(key, value);
                    } else if (Array.isArray(value)) {
                        // Check if it's an array of Files
                        if (value.length > 0 && value[0] instanceof File) {
                            // Append each file with the same field name for multer array handling
                            value.forEach(file => {
                                requestData.append(key, file);
                            });
                        } else {
                            // Handle arrays (like creatorRequests)
                            requestData.append(key, JSON.stringify(value));
                        }
                    } else if (typeof value === 'object' && value !== null) {
                        // Handle objects (like teamRequest)
                        requestData.append(key, JSON.stringify(value));
                    } else {
                        requestData.append(key, value);
                    }
                });
            } else {
                // If no files, use JSON
                requestData = this.details;
                headers['Content-Type'] = 'application/json';
            }

            const requestConfig = { headers };
            if (this.hasFiles && typeof options.onUploadProgress === 'function') {
                requestConfig.onUploadProgress = (progressEvent) => {
                    const { loaded, total } = progressEvent;
                    const percent = total ? Math.round((loaded / total) * 100) : 0;
                    options.onUploadProgress(percent);
                };
            }

            const response = await api.post(this.apiUrl, requestData, requestConfig);

            if (response.status === 200) {
                return response.data;
            } else {
                console.error("Failed to submit form", response.data.error);
                throw new Error(response.data.error);
            }
        } catch (error) {
            console.error("Error during form submission", error.response?.data?.error || error.message || error.error || "Unknown error occurred");
            throw error;
        }
    }
}

export { gIT, FormManager};
