// Focused DOM fixture for the real UIController's message/control methods.
// This is not a browser/layout implementation or accessibility certification.
class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.className = '';
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.value = '';
    this.disabled = false;
    this._html = '';
    this.classList = {
      contains: value => this.className.split(/\s+/).includes(value),
      add: value => {
        if (!this.classList.contains(value)) this.className = `${this.className} ${value}`.trim();
      },
      remove: value => {
        this.className = this.className.split(/\s+/).filter(item => item !== value).join(' ');
      }
    };
  }
  set innerHTML(value) {
    this._html = value;
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    const text = value.match(/<div class="message-text">([\s\S]*?)<\/div>/);
    if (text) {
      const element = new Element();
      element.className = 'message-text';
      element.innerHTML = text[1];
      this.appendChild(element);
    } else if (/<span class="message-loading"><\/span>/.test(value)) {
      const element = new Element('span');
      element.className = 'message-loading';
      this.appendChild(element);
    }
  }
  get innerHTML() { return this._html; }
  appendChild(element) {
    element.parentElement = this;
    this.children.push(element);
    return element;
  }
  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }
  querySelectorAll(selector) {
    const result = [];
    for (const child of this.children) {
      if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  scrollTo() {}
}

function createDomFixture() {
  const elements = {
    chatMessages: new Element(), chatInput: new Element('textarea'),
    sendBtn: new Element('button'), stopGenerationBtn: new Element('button')
  };
  elements.chatInput.value = 'next message';
  elements.stopGenerationBtn.className = 'hidden';
  return {
    elements,
    document: { addEventListener() {}, createElement: tag => new Element(tag) },
    requestAnimationFrame: callback => callback()
  };
}
module.exports = { createDomFixture };
