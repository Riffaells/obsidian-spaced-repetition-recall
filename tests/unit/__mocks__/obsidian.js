module.exports = {
    moment: {
        locale: jest.fn(() => "en"),
    },
    PluginSettingTab: jest.fn().mockImplementation(),
    Modal: jest.fn().mockImplementation(function () {
        this.contentEl = {
            empty: jest.fn(),
            createEl: jest.fn(() => ({
                setText: jest.fn(),
                addClass: jest.fn(),
                createDiv: jest.fn(() => ({
                    style: {},
                    createEl: jest.fn(() => ({
                        style: {},
                        textContent: "",
                        checked: false,
                        addEventListener: jest.fn(),
                        createSpan: jest.fn(),
                    })),
                    createDiv: jest.fn(() => ({
                        style: {},
                    })),
                })),
            })),
            addClass: jest.fn(),
        };
        this.modalEl = {
            addClasses: jest.fn(),
        };
        this.open = jest.fn();
        this.close = jest.fn();
    }),
    Platform: {
        get isMobile() {
            jest.fn(() => false);
        },
    },
};
