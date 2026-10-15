import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ImeSafeInput } from "@/components/ui/ime-safe-input";
import type {
  CodexChatReasoning,
  ModelApiFormat,
  ModelApiOptions,
} from "@/types";

export function ModelApiOptionsField({
  format,
  options = {},
  onChange,
  client,
}: {
  format: ModelApiFormat;
  options?: ModelApiOptions;
  onChange: (options: ModelApiOptions) => void;
  client: "claude" | "codex";
}) {
  const { t } = useTranslation();
  const id = useId();
  const label = (key: string) => t(`providerForm.modelApiOptions.${key}`);
  const select = (
    key: string,
    value: string | undefined,
    values: string[],
    change: (value: string | undefined) => void,
  ) => (
    <label className="flex flex-col gap-1 text-xs" htmlFor={`${id}-${key}`}>
      {label(key)}
      <select
        id={`${id}-${key}`}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        value={value ?? "inherit"}
        onChange={(event) =>
          change(
            event.target.value === "inherit" ? undefined : event.target.value,
          )
        }
      >
        <option value="inherit">{label("inherit")}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {value === "true"
              ? label("enabled")
              : value === "false"
                ? label("disabled")
                : value}
          </option>
        ))}
      </select>
    </label>
  );
  const reasoning = options.codexChatReasoning ?? {};
  const updateReasoning = (patch: Partial<CodexChatReasoning>) =>
    onChange({ ...options, codexChatReasoning: { ...reasoning, ...patch } });
  if (
    format === "openai_responses" ||
    (format === "openai_chat" && client === "claude")
  ) {
    return <p className="text-xs text-fg-2">{label("native")}</p>;
  }
  return (
    <details className="w-full rounded-md bg-muted/30 p-2">
      <summary className="cursor-pointer text-xs font-medium">
        {label("title")}
      </summary>
      <p className="my-2 text-xs text-fg-2">{label("hint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {format === "anthropic" ? (
          <>
            {select(
              "auth",
              options.apiKeyField,
              ["ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"],
              (apiKeyField) =>
                onChange({
                  ...options,
                  apiKeyField: apiKeyField as ModelApiOptions["apiKeyField"],
                }),
            )}
            {client === "codex" && (
              <label
                className="flex flex-col gap-1 text-xs"
                htmlFor={`${id}-max`}
              >
                {label("maxOutput")}
                <ImeSafeInput
                  id={`${id}-max`}
                  value={
                    options.maxOutputTokens === undefined
                      ? ""
                      : String(options.maxOutputTokens)
                  }
                  placeholder={label("inherit")}
                  onValueChange={(value) =>
                    onChange({
                      ...options,
                      maxOutputTokens: value.trim() ? Number(value) : undefined,
                    })
                  }
                />
              </label>
            )}
          </>
        ) : (
          <>
            {select(
              "thinking",
              reasoning.supportsThinking?.toString(),
              ["true", "false"],
              (value) =>
                updateReasoning({
                  supportsThinking:
                    value === undefined ? undefined : value === "true",
                }),
            )}
            {select(
              "effort",
              reasoning.supportsEffort?.toString(),
              ["true", "false"],
              (value) =>
                updateReasoning({
                  supportsEffort:
                    value === undefined ? undefined : value === "true",
                }),
            )}
            {select(
              "thinkingParam",
              reasoning.thinkingParam,
              ["none", "thinking", "enable_thinking", "reasoning_split"],
              (value) =>
                updateReasoning({
                  thinkingParam: value as CodexChatReasoning["thinkingParam"],
                }),
            )}
            {select(
              "effortParam",
              reasoning.effortParam,
              ["none", "reasoning_effort", "reasoning.effort"],
              (value) =>
                updateReasoning({
                  effortParam: value as CodexChatReasoning["effortParam"],
                }),
            )}
            {select(
              "effortMode",
              reasoning.effortValueMode,
              ["passthrough", "low_high", "deepseek", "openrouter", "zen"],
              (value) =>
                updateReasoning({
                  effortValueMode:
                    value as CodexChatReasoning["effortValueMode"],
                }),
            )}
          </>
        )}
      </div>
    </details>
  );
}
