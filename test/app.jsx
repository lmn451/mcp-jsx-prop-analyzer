import React, { useState } from "react";
import { Button, IconButton, LinkButton } from "./components/Button.jsx";
import { Input, TextArea, Select, Checkbox } from "./components/Form.jsx";

/**
 * Form data interface for contact form
 * @typedef {Object} FormData
 * @property {string} name - User's full name
 * @property {string} email - User's email address
 * @property {string} message - Message content
 * @property {boolean} newsletter - Newsletter subscription status
 */

/**
 * Contact form component
 * @returns {React.ReactElement} Rendered contact form
 */
export const App = () => {
  /** @type {FormData} */
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    newsletter: false,
  });

  /** @type {{value: string, label: string}[]} */
  const options = [
    { value: "general", label: "General Inquiry" },
    { value: "support", label: "Support" },
    { value: "sales", label: "Sales" },
  ];

  return (
    <div className="app">
      <header>
        <h1>Contact Form</h1>
        <IconButton icon="menu" onClick={() => setMenuOpen(!menuOpen)} />
      </header>

      <main>
        <form>
          <Input
            type="text"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            type="email"
            placeholder="Your email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />

          <Select
            options={options}
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="Select category"
          />

          <TextArea
            placeholder="Your message"
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            rows={6}
          />

          <Checkbox
            checked={formData.newsletter}
            onChange={(e) =>
              setFormData({ ...formData, newsletter: e.target.checked })
            }
            label="Subscribe to newsletter"
          />

          <div className="form-actions">
            <Button onClick={handleSubmit} variant="primary">
              Send Message
            </Button>
            <Button onClick={handleReset} variant="secondary">
              Reset
            </Button>
            <LinkButton href="/help" external={false}>
              Need Help?
            </LinkButton>
          </div>
        </form>
      </main>
    </div>
  );
};
