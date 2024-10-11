function gIT(i) {
    return document.getElementById(i).value;
}

class FormManager {
    constructor(type) {
        this.apiUrl = `${import.meta.env.VITE_API_URL}/api/form-submit`; // Read the API URL from the environment variable
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
        formBody.push(encodeURIComponent('X-Form-Type')+"="+encodeURIComponent(this.type))
        return formBody.join("&"); // Prepare the form body for submission
    }

    async submit(accessToken) {
        const body = this.prepareFormBody()
        console.log("sending ", body);
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Form-Type': this.type,
                },
                body: body
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Form submitted successfully", data);
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
