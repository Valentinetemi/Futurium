import type { ComponentProps } from 'react';
import { Text as NativeText, TextInput as NativeTextInput } from 'react-native';

import { typography } from '@/constants/theme';

type TextProps = ComponentProps<typeof NativeText> & {
  heading?: boolean;
};

export function Text({ heading = false, ...props }: TextProps) {
  return (
    <NativeText
      maxFontSizeMultiplier={
        heading ? typography.maxScale.heading : typography.maxScale.body
      }
      {...props}
    />
  );
}

export function TextInput(props: ComponentProps<typeof NativeTextInput>) {
  return (
    <NativeTextInput
      maxFontSizeMultiplier={typography.maxScale.control}
      {...props}
    />
  );
}
