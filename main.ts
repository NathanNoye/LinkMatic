import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
const { Modal } = require("obsidian");

interface KeywordConfiguration {
	keyword: string;
	displayWord: string;
	folder: string;
}

class PluginSettings {
	configurations: KeywordConfiguration[];

	constructor() {
		this.configurations = [];
	}
}

class KeywordLinkerSettingTab extends PluginSettingTab {
	plugin: LinkifyPlugin;

	constructor(app: App, plugin: LinkifyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Keyword Linker Settings" });

		this.plugin.settings.configurations.forEach(
			(config: any, index: any) => {
				const setting = new Setting(containerEl);

				setting.addText((text) =>
					text
						.setPlaceholder("Keyword")
						.setValue(config.keyword)
						.onChange(async (value) => {
							this.plugin.settings.configurations[index].keyword =
								value;
							await this.plugin.saveSettings();
						})
				);

				setting.addText((text) =>
					text
						.setPlaceholder("Display Word")
						.setValue(config.displayWord)
						.onChange(async (value) => {
							this.plugin.settings.configurations[
								index
							].displayWord = value;
							await this.plugin.saveSettings();
						})
				);

				setting.addText((text) =>
					text
						.setPlaceholder("Folder")
						.setValue(config.folder)
						.onChange(async (value) => {
							this.plugin.settings.configurations[index].folder =
								value;
							await this.plugin.saveSettings();
						})
				);

				setting.addButton((button) =>
					button.setButtonText("Remove").onClick(async () => {
						this.plugin.settings.configurations.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					})
				);
			}
		);

		new Setting(containerEl).addButton((button) =>
			button.setButtonText("Add Keyword").onClick(async () => {
				this.plugin.settings.configurations.push({
					keyword: "",
					displayWord: "",
					folder: "",
				});
				await this.plugin.saveSettings();
				this.display();
			})
		);
	}
}

export default class LinkifyPlugin extends Plugin {
	settings: PluginSettings;

	async loadSettings(): Promise<void> {
		const loadedSettings = await this.loadData();
		this.settings = Object.assign(new PluginSettings(), loadedSettings);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async linkKeywords(): Promise<void> {
		for (const config of this.settings.configurations) {
			const files = await this.getFilesInFolder(config.folder);
			for (const file of files) {
				const content = await this.app.vault.read(file);
				const newContent = this.replaceKeywords(
					content,
					config.keyword,
					config.displayWord
				);

				if (newContent !== content) {
					await this.app.vault.modify(file, newContent);
				}
			}
		}
	}

	async getFilesInFolder(folderPath: string) {
		if (!folderPath) {
			return this.app.vault.getMarkdownFiles();
		}

		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path.startsWith(folder!.path));

		// return [];
	}

	replaceKeywords(
		content: string,
		keyword: string,
		displayWord: string
	): string {
		const regex = new RegExp(`\\b${keyword}\\b(?![^\\[]*?\\]\\])`, "g");
		return content.replace(regex, `[[${displayWord}|${keyword}]]`);
	}

	showWarning() {
		const modal = new WarningModal(
			this.app,
			"This will make changes to your MD files",
			"Are you sure you want to proceed?",
			() => {
				this.linkKeywords();
			}
		);
		modal.open();
	}

	async onload(): Promise<void> {
		this.settings = new PluginSettings();
		await this.loadSettings();

		this.addSettingTab(new KeywordLinkerSettingTab(this.app, this));

		this.addRibbonIcon("link", "Link Keywords", () => {
			this.showWarning();
		});
	}
}

class WarningModal extends Modal {
	constructor(app: any, message: string, title: string, onConfirm: any) {
		super(app);
		this.message = message;
		this.title = title;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Set the modal content style
		contentEl.style.display = "flex";
		contentEl.style.flexDirection = "column";
		contentEl.style.alignItems = "center";
		contentEl.style.justifyContent = "center";

		// Add an H2 header with the title
		contentEl.createEl("h2", { text: this.title });

		// Add the message below the title, centered
		const messageEl = contentEl.createEl("p", { text: this.message });
		messageEl.style.textAlign = "center";
		messageEl.style.marginTop = "0px";
		messageEl.style.marginBottom = "30px";

		// Buttons container
		const buttonsDiv = contentEl.createEl("div");
		buttonsDiv.style.display = "flex";
		buttonsDiv.style.justifyContent = "center";
		buttonsDiv.style.width = "100%";
		buttonsDiv.style.marginTop = "20px";

		// Confirm button
		const confirmButton = buttonsDiv.createEl("button", {
			text: "Confirm",
		});
		confirmButton.classList.add("mod-cta");
		confirmButton.style.marginRight = "40px";

		// Cancel button
		const cancelButton = buttonsDiv.createEl("button", { text: "Cancel" });
		cancelButton.onclick = () => this.close();

		// Make confirm button close the modal and execute the callback
		confirmButton.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty(); // Clean up the content when the modal closes
	}
}
