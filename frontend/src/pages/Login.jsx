import "../styles/Login.css";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();

const [form, setForm] = useState({
  email: "",
  password: ""
});

const handleLogin = async () => {
  try {
    const res = await API.post("/auth/login", form);

    // save token
    localStorage.setItem("token", res.data.token);

    alert("Login success 🚀");

    // go to dashboard
    navigate("/dashboard");

  } catch (err) {
    alert("Login failed ❌");
  }
};

const handleChange = (e) => {
  setForm({
    ...form,
    [e.target.name]: e.target.value
  });
};
  return (
    <div className="login-container">

      <div className="login-box">

        <h1>Login</h1>

        <input
  name="email"
  type="email"
  placeholder="Enter your email"
  onChange={handleChange}
  value={form.email}
  autoComplete="email"
/>

<input
  name="password"
  type="password"
  placeholder="Enter your password"
  onChange={handleChange}
  value={form.password}
  autoComplete="new-password"
/>

        <button onClick={handleLogin}>
          Login
        </button>

        <p>
  Don't have an account?{" "}
  <Link to="/register">Register</Link>
</p>

      </div>

    </div>
  );
}

export default Login;