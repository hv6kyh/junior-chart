import { Component, Input } from '@angular/core';
import { DISCLOSURE_TYPE_LABELS, type DisclosureType } from '../../types/disclosure.types';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  templateUrl: './type-badge.component.html',
  styleUrls: ['./type-badge.component.css'],
})
export class TypeBadgeComponent {
  @Input({ required: true }) type!: DisclosureType;

  get label(): string {
    return DISCLOSURE_TYPE_LABELS[this.type] || this.type;
  }
}
