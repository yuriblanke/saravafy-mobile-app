import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";

type Props = ViewProps & {
  title: string;
  description?: string;
  titleColor: string;
  descriptionColor: string;
};

export function SettingsSection({
  title,
  description,
  titleColor,
  descriptionColor,
  style,
  children,
  ...rest
}: Props) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <Text
        style={[styles.title, { color: titleColor }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: descriptionColor }]}>
          {description}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  body: {
    width: "100%",
  },
});
