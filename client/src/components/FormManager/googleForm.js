function gIT(i) {
    return document.getElementById(i).value;
}

class GoogleFormSubmitter {
    constructor() {
        this.apiUrl = `${import.meta.env.VITE_API_URL}/api/form-submit`; // Read the API URL from the environment variable
        this.details = {};
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
        console.log("sending", this.prepareFormBody());

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: this.prepareFormBody()
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Form submitted successfully", data);
            } else {
                console.error("Failed to submit form", data.error);
            }
        } catch (error) {
            console.error("Error during form submission", error);
        }
    }
}

export { gIT, GoogleFormSubmitter };
