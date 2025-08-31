
import React, { useState } from 'react';

const EMIForm = () => {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    totalDue: '',
    emiAmount: '',
    dueDate: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting EMI Reminder Form', form);
    alert('EMI Reminder Submitted Successfully!');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>EMI Reminder Form</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Client Name:</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label>Mobile Number:</label>
          <input type="text" name="mobile" value={form.mobile} onChange={handleChange} required />
        </div>
        <div>
          <label>Total Due Amount (₹):</label>
          <input type="number" name="totalDue" value={form.totalDue} onChange={handleChange} required />
        </div>
        <div>
          <label>EMI Amount (₹):</label>
          <input type="number" name="emiAmount" value={form.emiAmount} onChange={handleChange} required />
        </div>
        <div>
          <label>Due Date:</label>
          <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} required />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default EMIForm;
