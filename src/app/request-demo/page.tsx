"use client";

import { FormEvent, useState } from "react";

export default function RequestDemoPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="demo-page">
      <section className="demo-card">
        <p className="eyebrow">Request a demo</p>

        <h1>See how TraceWell can support your care team</h1>

        <p className="demo-description">
          Tell us a little about your organisation and we will contact you to
          arrange a demonstration.
        </p>

        {submitted ? (
          <div className="success-message">
            <h2>Thank you!</h2>
            <p>Your demo request has been received.</p>
          </div>
        ) : (
          <form className="demo-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@organisation.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="organisation">Organisation</label>
              <input
                id="organisation"
                name="organisation"
                type="text"
                placeholder="Enter your organisation"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Your role</label>
              <select id="role" name="role" required>
                <option value="">Select your role</option>
                <option value="nurse">Nurse</option>
                <option value="health-practitioner">Health practitioner</option>
                <option value="care-manager">Care manager</option>
                <option value="administrator">Administrator</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">What would you like to explore?</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Tell us what your team needs"
              />
            </div>

            <button className="submit-button" type="submit">
              Submit request
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
