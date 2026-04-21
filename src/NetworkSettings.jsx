import React, { useState, useEffect } from "react";
import Toast from './Toast';
import { useNavigate, Link } from "react-router-dom";
import {
  setConnection,
  getConnection,
  getBaseURL
} from "./connectionManager";



export default function NetworkSettings() {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("5000");
  const [status, setStatus] = useState("Not connected");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
      const [toast, setToast] = useState({ message: '', type: 'error' });
  const closeToast = () => setToast({ message: '' });

  useEffect(() => {
    const saved = getConnection();
    setIp(saved.ip);
    setPort(saved.port);
  }, []);

  const testConnection = async () => {
    if (!ip || !port) {
      setStatus("❌ Enter IP and Port");
      return;
    }

    setLoading(true);
    setStatus("⏳ Connecting...");

    try {
      const res = await fetch(`http://${ip}:${port}/api/test`);

      if (res.ok) {
        setConnection(ip, port);
        setStatus("✅ Connected successfully");
        Navigate("/");
      } else {
        setStatus("⚠️ Server responded with error");
      }
    } catch (err) {
      setStatus("❌ Cannot reach server");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
            <Link to="/" style={homeLinkStyle}>← Back to Home</Link>
        <h2 style={styles.title}>⚙️ Network Connection</h2>
        <p style={styles.subtitle}>
          Connect this device to the main server on your network
        </p>

        <div style={styles.inputGroup}>
          <label>IP Address</label>
          <input
            type="text"
            placeholder="192.168.1.5"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Port</label>
          <input
            type="text"
            placeholder="3000"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            style={styles.input}
          />
        </div>

        <button
          onClick={testConnection}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Connecting..." : "Connect"}
        </button>

        <div style={styles.status}>{status}</div>

        <div style={styles.infoBox}>
          <p>💡 Make sure:</p>
          <ul>
            <li>Both devices are on the same WiFi</li>
            <li>Server is running</li>
            <li>Correct IP and port</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  title: {
    marginBottom: "5px"
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "#64748b",
    marginBottom: "20px"
  },
  inputGroup: {
    marginBottom: "15px",
    display: "flex",
    flexDirection: "column"
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1"
  },
  button: {
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer"
  },
  status: {
    marginTop: "15px",
    textAlign: "center",
    fontWeight: "bold"
  },
  infoBox: {
    marginTop: "20px",
    fontSize: "0.8rem",
    color: "#64748b"
  },
};

const homeLinkStyle = { display: 'inline-block', color: 'var(--maroon)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px', opacity: 0.7 };