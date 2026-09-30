import { prisma } from "../prisma";

export interface CustomFieldInput {
  fieldKey: string;
  value: any;
}

export async function getCustomFieldDefinitions(tenantId: string, entity: string) {
  return prisma.customFieldDefinition.findMany({
    where: {
      tenantId,
      entity,
      isActive: true,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });
}

export async function validateAndParseCustomFields(
  tenantId: string,
  entity: string,
  inputValues: Record<string, any>
) {
  const definitions = await getCustomFieldDefinitions(tenantId, entity);
  const errors: Record<string, string> = {};
  const validatedValues: Record<string, { definitionId: string; value: string }> = {};

  for (const def of definitions) {
    const rawVal = inputValues[def.fieldKey];

    // Check required constraint
    if (def.isRequired && (rawVal === undefined || rawVal === null || String(rawVal).trim() === "")) {
      errors[def.fieldKey] = `${def.label} is required`;
      continue;
    }

    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === "") {
      continue; // Skip optional empty field
    }

    const strVal = String(rawVal).trim();

    // Type validation
    if (def.fieldType === "NUMBER" || def.fieldType === "DECIMAL" || def.fieldType === "CURRENCY") {
      if (isNaN(Number(strVal))) {
        errors[def.fieldKey] = `${def.label} must be a valid number`;
        continue;
      }
    } else if (def.fieldType === "EMAIL") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strVal)) {
        errors[def.fieldKey] = `${def.label} must be a valid email address`;
        continue;
      }
    } else if (def.fieldType === "PHONE") {
      if (strVal.length < 7) {
        errors[def.fieldKey] = `${def.label} must be a valid phone number`;
        continue;
      }
    } else if (def.fieldType === "DROPDOWN" || def.fieldType === "RADIO") {
      if (def.optionsJson) {
        try {
          const options: string[] = JSON.parse(def.optionsJson);
          if (options.length > 0 && !options.includes(strVal)) {
            errors[def.fieldKey] = `${def.label} must be one of: ${options.join(", ")}`;
            continue;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    validatedValues[def.fieldKey] = {
      definitionId: def.id,
      value: strVal,
    };
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validatedValues,
  };
}

export async function saveMemberCustomFields(
  tenantId: string,
  memberId: string,
  validatedValues: Record<string, { definitionId: string; value: string }>
) {
  for (const [, data] of Object.entries(validatedValues)) {
    await prisma.memberCustomField.upsert({
      where: {
        memberId_customFieldId: {
          memberId,
          customFieldId: data.definitionId,
        },
      },
      update: {
        value: data.value,
      },
      create: {
        tenantId,
        memberId,
        customFieldId: data.definitionId,
        value: data.value,
      },
    });
  }
}
