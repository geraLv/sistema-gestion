import axios from 'axios';

async function checkApi() {
    try {
        const url = 'http://localhost:3000/api/cuotas/solicitud/1893';
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url);
        console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
checkApi();
