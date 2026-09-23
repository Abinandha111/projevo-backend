

import axios from "axios";

const API = axios.create({
  baseURL: "https://projevo-backend.onrender.com"
});

export default API;