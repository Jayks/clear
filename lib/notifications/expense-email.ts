import { formatCurrency } from "@/lib/utils";

interface ExpenseEmailParams {
  groupName: string;
  groupUrl: string;
  actorName: string;
  description: string;
  amount: number;
  currency: string;
  unsubscribeUrl: string;
}

export function buildExpenseEmail(params: ExpenseEmailParams): { subject: string; html: string } {
  const { groupName, groupUrl, actorName, description, amount, currency, unsubscribeUrl } = params;
  const formatted = formatCurrency(amount, currency);

  const subject = `[${groupName}] ${actorName} logged ${formatted} for ${description}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F0FDFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDFA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="display:inline-block;background:linear-gradient(140deg,#0EA5E9,#0891B2,#0D9488);border-radius:12px;width:40px;height:40px;line-height:40px;text-align:center;font-size:20px;color:#fff;font-weight:700;">C</span>
              <span style="display:inline-block;margin-left:8px;font-size:20px;font-weight:700;color:#0F172A;vertical-align:middle;">Clear</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:20px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

              <p style="margin:0 0 4px;font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${groupName}</p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0F172A;line-height:1.3;">
                ${actorName} logged a new expense
              </h1>

              <!-- Expense detail -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:13px;color:#64748B;">Description</p>
                    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0F172A;">${description}</p>
                    <p style="margin:0 0 4px;font-size:13px;color:#64748B;">Amount paid</p>
                    <p style="margin:0;font-size:28px;font-weight:700;color:#0891B2;">${formatted}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${groupUrl}" style="display:inline-block;background:linear-gradient(135deg,#06B6D4,#14B8A6);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;">
                      View in Clear →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                You're receiving this because you're a member of <strong>${groupName}</strong>.<br />
                <a href="${unsubscribeUrl}" style="color:#94A3B8;">Unsubscribe from this group's notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
