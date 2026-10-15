import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
import {
  buildModelApiFormats,
  modelApiFormatRows,
  ModelApiFormatsField,
  type ModelApiFormatRow,
} from "@/components/providers/forms/ModelApiFormatsField";

function Editor({ fullUrl = false }: { fullUrl?: boolean }) {
  const [rows, setRows] = useState(
    modelApiFormatRows({ "chat-model": "openai_chat" }),
  );
  return (
    <ModelApiFormatsField
      rows={rows}
      onChange={setRows}
      isFullUrl={fullUrl}
      models={[{ id: "catalog-model", ownedBy: null }]}
    />
  );
}

describe("model protocol overrides", () => {
  it("normalizes IDs, ignores empty rows, and detects incomplete/duplicate entries", () => {
    const row = (
      model: string,
      format: ModelApiFormatRow["format"],
    ): ModelApiFormatRow => ({ rowId: 1, model, format });
    expect(buildModelApiFormats([row("", "")])).toEqual({ formats: undefined });
    expect(buildModelApiFormats([row(" model[1M] ", "anthropic")])).toEqual({
      formats: { model: "anthropic" },
    });
    expect(buildModelApiFormats([row("", "anthropic")]).error).toBe(
      "missingModel",
    );
    expect(buildModelApiFormats([row("model", "")]).error).toBe(
      "missingProtocol",
    );
    expect(
      buildModelApiFormats([
        row("model", "anthropic"),
        row("model[1m]", "openai_chat"),
      ]).error,
    ).toBe("duplicate");
    expect(
      buildModelApiFormats(
        modelApiFormatRows({
          __proto__: "anthropic",
          model: "openai_responses",
        }),
      ).formats?.model,
    ).toBe("openai_responses");
  });

  it("loads existing rows, edits models and protocols, adds and removes rows", () => {
    render(<Editor />);
    const model = screen.getByRole("textbox", {
      name: "providerForm.modelApiFormats.model 1",
    });
    expect(model).toHaveValue("chat-model");
    fireEvent.change(model, { target: { value: "messages-model" } });
    fireEvent.click(
      screen.getByRole("combobox", {
        name: "providerForm.modelApiFormats.protocol 1",
      }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Anthropic Messages" }));
    expect(
      screen.getByRole("combobox", {
        name: "providerForm.modelApiFormats.protocol 1",
      }),
    ).toHaveTextContent("Anthropic Messages");
    fireEvent.click(
      screen.getByRole("button", { name: "providerForm.modelApiFormats.add" }),
    );
    expect(
      screen.getAllByRole("textbox", {
        name: /providerForm.modelApiFormats.model/,
      }),
    ).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", {
        name: "providerForm.modelApiFormats.remove 1",
      }),
    );
    expect(
      screen.getAllByRole("textbox", {
        name: /providerForm.modelApiFormats.model/,
      }),
    ).toHaveLength(1);
  });

  it("selects an existing catalog model", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Select model" }));
    fireEvent.click(screen.getByText("catalog-model"));
    expect(screen.getByRole("textbox")).toHaveValue("catalog-model");
  });

  it("explains the full URL conflict and disables adding overrides", () => {
    render(<Editor fullUrl />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "providerForm.modelApiFormats.fullUrl",
    );
    expect(
      screen.getByRole("button", { name: "providerForm.modelApiFormats.add" }),
    ).toBeDisabled();
  });
  it("round-trips upstream options, keeps explicit false, and validates output limits", () => {
    const formats = { ds: "openai_chat", haiku: "anthropic" } as const;
    const options = {
      ds: {
        codexChatReasoning: {
          supportsThinking: false,
          supportsEffort: true,
          thinkingParam: "none",
          effortValueMode: "passthrough",
        },
      },
      haiku: { apiKeyField: "ANTHROPIC_API_KEY", maxOutputTokens: 4096 },
    } as const;
    expect(buildModelApiFormats(modelApiFormatRows(formats, options))).toEqual({
      formats,
      options,
    });
    const rows = modelApiFormatRows(formats, options);
    rows[1].options = { maxOutputTokens: -1 };
    expect(buildModelApiFormats(rows).error).toBe("invalidMaxOutput");
    rows[1].options = { maxOutputTokens: 1.5 };
    expect(buildModelApiFormats(rows).error).toBe("invalidMaxOutput");
    rows[1].options = { maxOutputTokens: Number.NaN };
    expect(buildModelApiFormats(rows).error).toBe("invalidMaxOutput");
    rows[1].options = {};
    rows[0].options = { codexChatReasoning: { supportsThinking: undefined } };
    expect(buildModelApiFormats(rows)).toEqual({ formats });
    expect(
      buildModelApiFormats(
        modelApiFormatRows(
          { ds: "openai_chat" },
          { ds: { maxOutputTokens: 8 } },
        ),
      ).options,
    ).toBeUndefined();
  });

  it("edits Chat upstream mapping, resets to inheritance, and clears settings on protocol change", () => {
    render(<Editor />);
    const details = screen
      .getByText("providerForm.modelApiOptions.title")
      .closest("details")!;
    details.open = true;
    fireEvent.change(
      screen.getByLabelText("providerForm.modelApiOptions.thinkingParam"),
      { target: { value: "enable_thinking" } },
    );
    expect(
      screen.getByLabelText("providerForm.modelApiOptions.thinkingParam"),
    ).toHaveValue("enable_thinking");
    fireEvent.change(
      screen.getByLabelText("providerForm.modelApiOptions.thinkingParam"),
      { target: { value: "inherit" } },
    );
    expect(
      screen.getByLabelText("providerForm.modelApiOptions.thinkingParam"),
    ).toHaveValue("inherit");
    fireEvent.click(
      screen.getByRole("combobox", {
        name: "providerForm.modelApiFormats.protocol 1",
      }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Anthropic Messages" }));
    const messages = screen
      .getByText("providerForm.modelApiOptions.title")
      .closest("details")!;
    messages.open = true;
    expect(
      screen.queryByLabelText("providerForm.modelApiOptions.thinkingParam"),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("providerForm.modelApiOptions.auth"),
      { target: { value: "ANTHROPIC_API_KEY" } },
    );
    fireEvent.change(
      screen.getByLabelText("providerForm.modelApiOptions.maxOutput"),
      { target: { value: "4096" } },
    );
    expect(
      screen.getByLabelText("providerForm.modelApiOptions.maxOutput"),
    ).toHaveValue("4096");
  });
});
