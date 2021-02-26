import React from 'react';

export interface PhatalityRowProps {
  field: string;
  value: string;
}

export function PhatalityRow ({
  field,
  value
}: PhatalityRowProps) {
  return (
    <tr><td>{field}</td><td>{value}</td></tr>
  );
}
