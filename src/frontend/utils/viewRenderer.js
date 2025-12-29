import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml } from './errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple template engine for rendering views
 */
class ViewRenderer {
  constructor() {
    this.viewsDir = path.join(__dirname, '../views');
    this.partials = {};
    this.cache = {};
  }

  /**
   * Load and cache a template file
   * @param {string} templateName - Name of the template file
   * @returns {string} Template content
   */
  loadTemplate(templateName) {
    if (this.cache[templateName]) {
      return this.cache[templateName];
    }

    const templatePath = path.join(this.viewsDir, `${templateName}.html`);
    try {
      const content = fs.readFileSync(templatePath, 'utf8');
      this.cache[templateName] = content;
      return content;
    } catch {
      const availableTemplates = fs.existsSync(this.viewsDir)
        ? fs.readdirSync(this.viewsDir).join(', ')
        : 'none';
      throw new Error(
        `Template ${templateName} not found: ${templatePath}. Available templates: ${availableTemplates}`
      );
    }
  }

  /**
   * Load all partials from the partials directory
   */
  loadPartials() {
    const partialsDir = path.join(this.viewsDir, 'partials');
    try {
      const files = fs.readdirSync(partialsDir);
      files.forEach((file) => {
        if (file.endsWith('.html')) {
          const partialName = file.replace('.html', '');
          const partialPath = path.join(partialsDir, file);
          this.partials[partialName] = fs.readFileSync(partialPath, 'utf8');
        }
      });
    } catch {
      // Partial directory doesn't exist or is empty
      this.partials = {};
    }
  }

  /**
   * Render a template with data
   * @param {string} templateName - Name of the template
   * @param {Object} data - Data to render in template
   * @returns {string} Rendered HTML
   */
  render(templateName, data = {}) {
    // Ensure partials are loaded
    if (Object.keys(this.partials).length === 0) {
      this.loadPartials();
    }

    // Load the main template
    let template = this.loadTemplate(templateName);

    // Process partials first
    template = this.processPartials(template, data);

    // Process variables
    template = this.processVariables(template, data);

    // Process conditionals
    template = this.processConditionals(template, data);

    return template;
  }

  /**
   * Process partials ({{> partialName}})
   * @param {string} template - Template content
   * @param {Object} data - Data for rendering
   * @returns {string} Template with partials processed
   */
  processPartials(template, data) {
    const partialRegex = /{{>\s*([\w-]+)\s*}}/g;
    return template.replace(partialRegex, (match, partialName) => {
      if (this.partials[partialName]) {
        return this.renderPartial(partialName, data);
      }
      return `<!-- Partial ${escapeHtml(partialName)} not found -->`;
    });
  }

  /**
   * Render a partial with data
   * @param {string} partialName - Name of the partial
   * @param {Object} data - Data for rendering
   * @returns {string} Rendered partial
   */
  renderPartial(partialName, data) {
    let partial = this.partials[partialName];
    partial = this.processVariables(partial, data);
    partial = this.processConditionals(partial, data);
    return partial;
  }

  /**
   * Process variables ({{variableName}})
   * @param {string} template - Template content
   * @param {Object} data - Data for rendering
   * @returns {string} Template with variables processed
   */
  processVariables(template, data) {
    return template.replace(/{{([^{}]+)}}/g, (match, variableName) => {
      const trimmedVar = variableName.trim();
      const value = this.getNestedValue(data, trimmedVar);
      return value !== undefined ? escapeHtml(String(value)) : '';
    });
  }

  /**
   * Process conditionals ({{#if condition}}...{{/if}})
   * @param {string} template - Template content
   * @param {Object} data - Data for rendering
   * @returns {string} Template with conditionals processed
   */
  processConditionals(template, data) {
    // Handle if conditionals
    const ifRegex = /{{#if\s+([^{}]+)}}(.*?){{\/if}}/gs;
    return template.replace(ifRegex, (_match, condition, content) => {
      const conditionValue = this.getNestedValue(data, condition.trim());
      return conditionValue !== undefined && conditionValue ? content : '';
    });
  }

  /**
   * Get nested value from data object using dot notation
   * @param {Object} obj - Data object
   * @param {string} path - Path to value (e.g., "user.name")
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => (o || {})[p], obj);
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache() {
    this.cache = {};
    this.partials = {};
  }
}

export default new ViewRenderer();
