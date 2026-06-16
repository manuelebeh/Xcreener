import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Slider } from './Slider';

const meta: Meta<typeof Slider> = {
  title: 'Components/Slider',
  component: Slider,
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState([40]);
    return (
      <div style={{ width: 280 }}>
        <Slider value={value} onValueChange={setValue} />
        <p style={{ marginTop: 8, fontSize: 14 }}>Value: {value[0]}</p>
      </div>
    );
  },
};

export const Disabled: Story = { args: { disabled: true, defaultValue: [60] } };
