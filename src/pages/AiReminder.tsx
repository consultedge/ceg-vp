import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
} from "@mui/material";

const AiReminder: React.FC = () => {
  const [formData, setFormData] = useState({
    clientName: "",
    mobileNumber: "",
    totalDueAmount: "",
    emiAmount: "",
    dueDate: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Submitting EMI Reminder Form:", formData);

    // TODO: Replace with your API Gateway POST call
    // fetch("https://5uuch24xvd.execute-api.ap-southeast-1.amazonaws.com/staging/emi-reminder", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(formData),
    // })
    //   .then((res) => res.json())
    //   .then((data) => console.log("Response:", data))
    //   .catch((err) => console.error("Error:", err));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: "16px" }}>
        <Typography
          variant="h5"
          gutterBottom
          align="center"
          sx={{ fontWeight: "bold" }}
        >
          Client Information
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 3 }}>
          Enter client details for EMI reminder call
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Client Name"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Mobile Number"
            name="mobileNumber"
            value={formData.mobileNumber}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Total Due Amount (₹)"
            name="totalDueAmount"
            value={formData.totalDueAmount}
            onChange={handleChange}
            type="number"
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="EMI Amount (₹)"
            name="emiAmount"
            value={formData.emiAmount}
            onChange={handleChange}
            type="number"
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Due Date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3, py: 1.5, borderRadius: "10px" }}
          >
            Start AI Call
          </Button>
        </Box>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 2, color: "text.secondary", cursor: "pointer" }}
        >
          Logout
        </Typography>
      </Paper>
    </Container>
  );
};

export default AiReminder;
