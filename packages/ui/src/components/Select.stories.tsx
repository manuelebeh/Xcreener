import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <label htmlFor="theme-select" className="block text-sm font-medium">
      Theme
      <Select id="theme-select" className="mt-2" defaultValue="system">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    </label>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled defaultValue="light">
      <option value="light">Light</option>
    </Select>
  ),
};
