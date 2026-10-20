import { useVizProgram, type VizProgramOptions } from './useVizProgram'

/**
 * Renders a program in the viz statement language with the `visualization` components.
 * Render it inside `VizRoot`. State such as slider values lives here and never reaches the server.
 *
 * @example
 * <VizRoot>
 *   <VizProgram source={'root = Chart(type: "bar", data: data.channels, x: "channel", y: "share")'} data={{ channels }} />
 * </VizRoot>
 */
export function VizProgram(props: VizProgramOptions) {
  return <>{useVizProgram(props).element}</>
}
