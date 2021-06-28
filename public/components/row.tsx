import React from 'react';

export interface PhatalityRowProps {
  field: string;
  value: string;
}

export function PhatalityLine ({
  field,
  value
}: PhatalityRowProps) {
  return (
    <tr>
      <td>{field}</td>
      <td><textarea readOnly rows={1} className="euiTextArea" onClick={(e) => {
        // @ts-ignore: e.target is typed "any"
        e.target.select()}} value={value}></textarea></td>
    </tr>
  );
}

export function PhatalityArea ({
  field,
  value
}: PhatalityRowProps) {
  return (
    <tr>
      <td>{field}</td>
      <td><textarea readOnly rows={5} className="euiTextArea" onClick={(e) => {
        // @ts-ignore: e.target is typed "any"
        e.target.select()}} value={value}></textarea></td>
    </tr>
  );
}
