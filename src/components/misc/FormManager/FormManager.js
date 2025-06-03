import api from "@/utils/api";

function gIT(i) {
    return document.getElementById(i).value;
}

class FormManager {
    constructor(type) {``
        this.apiUrl = `${import.meta.env.VITE_FORM_SUBMIT}`; // Read the API URL from the environment variable
        this.details = {};
        this.type = type;
        this.hasFiles = false;
    }

    setDetail(key, value) {
        // Check if the value is a File object
        if (value instanceof File) {
            this.hasFiles = true;
        }
        this.details[key] = value; // Add form details as key-value pairs
    }

    getDetail(key) {
        return this.details[key]; // Retrieve the details using the key
    }

    async submit() {
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
                        // Handle arrays (like creatorRequests)
                        requestData.append(key, JSON.stringify(value));
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

            const response = await api.post(this.apiUrl, requestData, { headers });

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
