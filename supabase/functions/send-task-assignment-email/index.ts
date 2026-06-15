// @ts-nocheck - This is a Deno Edge Function with URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { to, name, taskTitle, taskDescription, dueDate, from } = await req.json();

    if (!to || !name || !taskTitle || !from) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, name, taskTitle, from" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const dueDateFormatted = dueDate
      ? new Date(dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : null;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2563eb;
              margin-bottom: 20px;
            }
            p {
              margin-bottom: 16px;
            }
            .task-box {
              background-color: #f3f4f6;
              border-left: 4px solid #2563eb;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .task-title {
              font-weight: 600;
              font-size: 16px;
              margin-bottom: 8px;
            }
            .task-description {
              white-space: pre-wrap;
              word-wrap: break-word;
              color: #4b5563;
            }
            .due-date {
              margin-top: 12px;
              font-size: 14px;
              color: #dc2626;
              font-weight: 600;
            }
            .from-info {
              color: #6b7280;
              font-size: 14px;
              margin-top: 8px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>New task assigned to you</h1>
            <p>Hello ${name},</p>
            <p>A new task has been assigned to you on HSE Hub:</p>
            <div class="task-box">
              <div class="task-title">${taskTitle}</div>
              ${taskDescription ? `<div class="task-description">${taskDescription}</div>` : ""}
              ${dueDateFormatted ? `<div class="due-date">Due: ${dueDateFormatted}</div>` : ""}
            </div>
            <div class="from-info">
              <strong>Assigned by:</strong> ${from}
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Please log in to HSE Hub to view the full task details.
            </p>
            <div class="footer">
              <p>This is an automated message from HSE Hub.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "HSE Hub",
          email: "noreply@hse-hub.com",
        },
        to: [
          {
            email: to,
            name: name,
          },
        ],
        subject: `New task assigned: ${taskTitle}`,
        htmlContent: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Brevo API error:", data);
      return new Response(JSON.stringify({ error: "Failed to send email", details: data }), {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in send-task-assignment-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
