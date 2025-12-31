import fs from 'fs';
import path from 'path';
import { LogTemplate } from '../types/log.types';

/**
 * Template Model - Handles persistence of log templates
 */
export class TemplateModel {
  private templatesPath: string;
  private templates: Map<string, LogTemplate> = new Map();

  constructor(templatesDir: string = path.join(__dirname, '..', '..', 'templates')) {
    this.templatesPath = path.join(templatesDir, 'templates.json');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Load existing templates
    this.loadTemplates();
  }

  /**
   * Load templates from disk
   */
  private loadTemplates(): void {
    try {
      if (fs.existsSync(this.templatesPath)) {
        const data = fs.readFileSync(this.templatesPath, 'utf-8');
        const templates: LogTemplate[] = JSON.parse(data);
        
        templates.forEach(template => {
          this.templates.set(template.id, template);
        });
        
        console.log(`Loaded ${templates.length} templates from disk`);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  /**
   * Save templates to disk
   */
  async saveTemplates(templates: LogTemplate[]): Promise<void> {
    try {
      // Merge with existing templates
      templates.forEach(template => {
        this.templates.set(template.id, template);
      });

      // Convert to array and save
      const templatesArray = Array.from(this.templates.values());
      fs.writeFileSync(this.templatesPath, JSON.stringify(templatesArray, null, 2), 'utf-8');
      
      console.log(`Saved ${templatesArray.length} templates to disk`);
    } catch (error) {
      console.error('Error saving templates:', error);
      throw error;
    }
  }

  /**
   * Get all templates
   */
  getAllTemplates(): LogTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by service
   */
  getTemplatesByService(serviceName: string): LogTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.service === serviceName
    );
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): LogTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    if (this.templates.has(id)) {
      this.templates.delete(id);
      await this.saveTemplates([]); // Save current state
      return true;
    }
    return false;
  }

  /**
   * Clear all templates
   */
  async clearAll(): Promise<void> {
    this.templates.clear();
    if (fs.existsSync(this.templatesPath)) {
      fs.unlinkSync(this.templatesPath);
    }
  }
}

