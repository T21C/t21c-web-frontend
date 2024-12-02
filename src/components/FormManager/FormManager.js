import axios from "axios";
import api from "../../utils/api";

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

    prepareFormBody() {
        let formBody = [];
        for (const each in this.details) {
            const encodeKey = encodeURIComponent(each);
            const encodeValue = encodeURIComponent(this.details[each]);
            formBody.push(encodeKey + "=" + encodeValue);
        }
        return formBody.join("&"); // Prepare the form body for submission
    }

    async submit(accessToken) {
        const body = this.prepareFormBody()
        console.log("sending form");
        
        try {
            const response = await api.post(this.apiUrl, 
                body,  // This is the data payload
                {     // This is the config object
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Form-Type': this.type,
                    }
                }
            );

            const data = await response.data;
            console.log(response);
            if (response.status === 200) {
                console.log("Form submitted successfully");
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
