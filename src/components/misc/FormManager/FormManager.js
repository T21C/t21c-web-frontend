import axios from "axios";
import api from "../../../utils/api";

function gIT(i) {
    return document.getElementById(i).value;
}

class FormManager {
    constructor(type) {
        this.apiUrl = `${import.meta.env.VITE_FORM_SUBMIT}`; // Read the API URL from the environment variable
        this.details = {};
        this.type = type
    }

    setDetail(key, value) {
        this.details[key] = value; // Add form details as key-value pairs
    }

    getDetail(key) {
        return this.details[key]; // Retrieve the details using the key
    }

    async submit(accessToken) {
        try {
            const response = await api.post(this.apiUrl, 
                this.details,  // Send the details object directly as JSON
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Form-Type': this.type,
                    }
                }
            );

            const data = await response.data;
            if (response.status === 200) {
                return "ok";
            } else {
                console.error("Failed to submit form", data.error);
                return data.error;
            }
        } catch (error) {
            console.error("Error during form submission", error);
            return error
        }
    }
}

export { gIT, FormManager};
