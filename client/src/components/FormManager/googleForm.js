function gIT(i) {
    return document.getElementById(i).value;
}

class GoogleFormSubmitter {
    constructor(appScriptUrl) {
        this.appScriptUrl = appScriptUrl; // Store the Apps Script URL
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

    submit(accessToken) {
        console.log("sending", this.prepareFormBody());
        
            fetch(this.appScriptUrl, {
                mode: 'no-cors',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'insomnia/8.6.1'
                },
                body: this.prepareFormBody()
            }).then(response => console.log("Form submitted successfully", response))
              .catch(error => console.error("Failed to submit form", error));
        }
}

export { gIT, GoogleFormSubmitter };
