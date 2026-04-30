import {App, PluginSettingTab, Setting} from "obsidian";
import type CanvasNodeCollectorPlugin  from "./main";

export interface CanvasNodeCollectorSettings  {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
    relatedHopDepth: number;
    includeRelatedParentNodes: boolean;
    includeRelatedChildNodes: boolean;
}

export const DEFAULT_SETTINGS: CanvasNodeCollectorSettings  = {

    apiKey: "",
    baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
    model: "glm-4.5",
    temperature: 0.2,
    maxTokens: 1024,
    relatedHopDepth: 1,
    includeRelatedParentNodes: true,
    includeRelatedChildNodes: true,
}

export class CanvasNodeCollectorSettingTab   extends PluginSettingTab {
	plugin: CanvasNodeCollectorPlugin;

	constructor(app: App, plugin: CanvasNodeCollectorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

        new Setting(containerEl)
// eslint-disable-next-line obsidianmd/ui/sentence-case
	.setName("Zhipu API Key")
// eslint-disable-next-line obsidianmd/ui/sentence-case
	.setDesc("Used for calling the Zhipu chat completions API.")
	.addText((text) => {
		text
			.setPlaceholder("Enter your API key")
			.setValue(this.plugin.settings.apiKey)
			.onChange(async (value) => {
				this.plugin.settings.apiKey = value.trim();
				await this.plugin.saveSettings();
			});

		text.inputEl.type = "password";
		text.inputEl.autocomplete = "off";
	});
    new Setting(containerEl)
// eslint-disable-next-line obsidianmd/ui/sentence-case
	.setName("Chat Completions URL")
// eslint-disable-next-line obsidianmd/ui/sentence-case
	.setDesc("Zhipu OpenAI-compatible endpoint.")
	.addText((text) =>
		text
			.setPlaceholder("https://open.bigmodel.cn/api/coding/paas/v4/chat/completions")
			.setValue(this.plugin.settings.baseUrl)
			.onChange(async (value) => {
				this.plugin.settings.baseUrl = value.trim();
				await this.plugin.saveSettings();
			}),
	);
    new Setting(containerEl)
	.setName("Temperature")
	.setDesc("Lower values are more stable.")
	.addSlider((slider) =>
		slider
			.setLimits(0, 1, 0.1)
			.setValue(this.plugin.settings.temperature)
			.setDynamicTooltip()
			.onChange(async (value) => {
				this.plugin.settings.temperature = value;
				await this.plugin.saveSettings();
			}),
	);
    new Setting(containerEl)
// eslint-disable-next-line obsidianmd/ui/sentence-case
	.setName("Max Tokens")
// eslint-disable-next-line obsidianmd/ui/sentence-case
	.setDesc("Maximum response length.")
	.addText((text) =>
		text
			.setPlaceholder("1024")
			.setValue(String(this.plugin.settings.maxTokens))
			.onChange(async (value) => {
				const parsed = Number(value);
				if (!Number.isNaN(parsed) && parsed > 0) {
					this.plugin.settings.maxTokens = parsed;
					await this.plugin.saveSettings();
				}
			}),
	);

    new Setting(containerEl)
	.setName("Model")
	.setDesc("Example: glm-4.5")
	.addText((text) =>
		text
			.setPlaceholder("glm-4.5")
			.setValue(this.plugin.settings.model)
			.onChange(async (value) => {
				this.plugin.settings.model = value.trim();
				await this.plugin.saveSettings();
			}),
	);

	new Setting(containerEl)
		.setName("Related context")
		.setDesc("Controls for selecting directly related Canvas nodes.");

	new Setting(containerEl)
		.setName("Related hop depth")
		.setDesc("How many Canvas edge hops to include for related context.")
		.addSlider((slider) =>
			slider
				.setLimits(1, 4, 1)
				.setValue(this.plugin.settings.relatedHopDepth)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.relatedHopDepth = value;
					await this.plugin.saveSettings();
				}),
		);

	new Setting(containerEl)
		.setName("Include parent nodes")
		.setDesc("Include nodes that point into the selected node.")
		.addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.includeRelatedParentNodes)
				.onChange(async (value) => {
					this.plugin.settings.includeRelatedParentNodes = value;
					await this.plugin.saveSettings();
				}),
		);

	new Setting(containerEl)
		.setName("Include child nodes")
		.setDesc("Include nodes that the selected node points to.")
		.addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.includeRelatedChildNodes)
				.onChange(async (value) => {
					this.plugin.settings.includeRelatedChildNodes = value;
					await this.plugin.saveSettings();
				}),
		);

	}



}
