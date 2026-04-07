import {App, PluginSettingTab, Setting} from "obsidian";
import CanvasNodeCollectorPlugin  from "./main";

export interface CanvasNodeCollectorSettings  {
	mySetting: string;
}

export const DEFAULT_SETTINGS: CanvasNodeCollectorSettings  = {
	mySetting: 'default'
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
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
