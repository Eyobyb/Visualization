declare module 'virtual:viz-docs' {
  export interface PropDoc {
    name: string
    type: string
    required: boolean
    default?: string
    description: string
  }
  export interface ComponentDoc {
    name: string
    family: string
    description: string
    props: PropDoc[]
  }
  export interface ExampleDoc {
    /** Export name in src/catalog/examples.tsx. */
    name: string
    component: string
    label: string
    code: string
  }
  const docs: { families: string[]; components: ComponentDoc[]; examples: ExampleDoc[] }
  export default docs
}
