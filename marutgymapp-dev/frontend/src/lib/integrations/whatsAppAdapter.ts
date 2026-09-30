import { prisma } from "../prisma";

export interface SendWhatsAppParams {
  tenantId: string;
  recipientPhone: string;
  recipientType?: "MEMBER" | "OWNER" | "STAFF" | "TRAINER";
  templateName?: string;
  variables?: Record<string, string>;
  customText?: string;
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams) {
  const { tenantId, recipientPhone, templateName, variables = {}, customText } = params;

  // Retrieve tenant branding and settings
  const branding = await prisma.tenantBranding.findUnique({ where: { tenantId } });
  const businessName = branding?.businessName || "Cross Road Fitness";

  let body = customText || "";

  if (templateName) {
    const template = await prisma.whatsAppTemplate.findFirst({
      where: { tenantId, name: templateName },
    });

    if (template) {
      body = template.content;
      // Replace placeholders like {{member_name}}, {{business_name}}, {{amount}}, {{expiry_date}}
      const mergedVars: Record<string, string> = {
        business_name: businessName,
        ...variables,
      };

      for (const [k, v] of Object.entries(mergedVars)) {
        body = body.replace(new RegExp(`{{${k}}}`, "g"), v);
      }
    }
  }

  if (!body) {
    body = `Hello! Message from ${businessName}.`;
  }

  // Create message log
  const messageLog = await prisma.whatsAppMessage.create({
    data: {
      tenantId,
      recipientPhone,
      recipientType: params.recipientType || "MEMBER",
      messageBody: body,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  return {
    success: true,
    messageId: messageLog.id,
    body,
  };
}

export async function triggerWhatsAppAutomation(
  tenantId: string,
  event: "MEMBERSHIP_EXPIRING_7_DAYS" | "PAYMENT_OVERDUE" | "NEW_MEMBER_CREATED" | "MEMBERSHIP_RENEWED" | "BIRTHDAY",
  data: { recipientPhone: string; memberName: string; extraVars?: Record<string, string> }
) {
  const rule = await prisma.whatsAppAutomationRule.findFirst({
    where: { tenantId, triggerEvent: event, isEnabled: true },
  });

  if (!rule) return;

  const template = await prisma.whatsAppTemplate.findUnique({
    where: { id: rule.templateId },
  });

  if (!template) return;

  await sendWhatsAppMessage({
    tenantId,
    recipientPhone: data.recipientPhone,
    templateName: template.name,
    variables: {
      member_name: data.memberName,
      ...data.extraVars,
    },
  });
}
