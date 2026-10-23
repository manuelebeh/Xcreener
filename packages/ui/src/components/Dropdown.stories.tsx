import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Open menu</Button>,
    items: [
      { label: 'Capture', value: 'capture' },
      { label: 'Beautify', value: 'beautify' },
      { label: 'Share', value: 'share' },
    ],
  },
};

export const WithHints: Story = {
  args: {
    trigger: <Button variant="secondary">LinkedIn</Button>,
    items: [
      { label: 'Image / link', value: 'linkedin', hint: '1200×627' },
      { label: 'Square', value: 'linkedin-square', hint: '1080×1080' },
      { label: 'Portrait / carousel', value: 'linkedin-portrait', hint: '1080×1350' },
    ],
  },
};
