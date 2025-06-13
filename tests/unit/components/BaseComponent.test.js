/**
 * BaseComponent Test Suite
 */

import BaseComponent from '../../../content/components/BaseComponent.js';

describe('BaseComponent', () => {
  let component;

  beforeEach(() => {
    component = new BaseComponent();
  });

  afterEach(() => {
    if (component && component.element) {
      component.destroy();
    }
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(component.options).toEqual({});
      expect(component.element).toBeNull();
      expect(component.state).toEqual({});
      expect(component.children).toBeInstanceOf(Map);
      expect(component._mounted).toBe(false);
    });

    it('should accept options', () => {
      const options = { foo: 'bar' };
      const comp = new BaseComponent(options);
      expect(comp.options).toEqual(options);
    });
  });

  describe('setState', () => {
    it('should update state', () => {
      component.setState({ count: 1 });
      expect(component.state.count).toBe(1);

      component.setState({ count: 2, name: 'test' });
      expect(component.state.count).toBe(2);
      expect(component.state.name).toBe('test');
    });

    it('should call onStateChange', () => {
      component.onStateChange = jest.fn();
      const oldState = { ...component.state };
      const newState = { count: 1 };

      component.setState(newState);

      expect(component.onStateChange).toHaveBeenCalledWith(
        oldState,
        { ...oldState, ...newState }
      );
    });
  });

  describe('child management', () => {
    it('should add and get child components', () => {
      const child = new BaseComponent();
      component.addChild('testChild', child);

      expect(component.getChild('testChild')).toBe(child);
      expect(component.children.size).toBe(1);
    });

    it('should remove child components', () => {
      const child = new BaseComponent();
      child.destroy = jest.fn();

      component.addChild('testChild', child);
      component.removeChild('testChild');

      expect(child.destroy).toHaveBeenCalled();
      expect(component.getChild('testChild')).toBeNull();
      expect(component.children.size).toBe(0);
    });

    it('should return null for non-existent child', () => {
      expect(component.getChild('nonExistent')).toBeNull();
    });
  });

  describe('visibility methods', () => {
    beforeEach(() => {
      component.element = document.createElement('div');
    });

    it('should show element', () => {
      component.element.style.display = 'none';
      component.show();
      expect(component.element.style.display).toBe('');
    });

    it('should hide element', () => {
      component.hide();
      expect(component.element.style.display).toBe('none');
    });

    it('should check visibility', () => {
      expect(component.isVisible()).toBe(true);
      
      component.hide();
      expect(component.isVisible()).toBe(false);
      
      component.show();
      expect(component.isVisible()).toBe(true);
    });
  });

  describe('lifecycle methods', () => {
    it('should track mounted state', () => {
      expect(component.isMounted()).toBe(false);
      
      component._mounted = true;
      expect(component.isMounted()).toBe(true);
    });

    it('should throw error if render not implemented', async () => {
      await expect(component.render()).rejects.toThrow(
        'render() must be implemented by subclass'
      );
    });
  });

  describe('destroy', () => {
    it('should destroy all children', () => {
      const child1 = new BaseComponent();
      const child2 = new BaseComponent();
      child1.destroy = jest.fn();
      child2.destroy = jest.fn();

      component.addChild('child1', child1);
      component.addChild('child2', child2);

      component.destroy();

      expect(child1.destroy).toHaveBeenCalled();
      expect(child2.destroy).toHaveBeenCalled();
      expect(component.children.size).toBe(0);
    });

    it('should remove element from DOM', () => {
      const parent = document.createElement('div');
      component.element = document.createElement('div');
      parent.appendChild(component.element);

      expect(parent.children.length).toBe(1);
      
      component.destroy();
      
      expect(parent.children.length).toBe(0);
    });

    it('should set mounted to false', () => {
      component._mounted = true;
      component.destroy();
      expect(component._mounted).toBe(false);
    });

    it('should call onDestroy', () => {
      component.onDestroy = jest.fn();
      component.destroy();
      expect(component.onDestroy).toHaveBeenCalled();
    });
  });
});