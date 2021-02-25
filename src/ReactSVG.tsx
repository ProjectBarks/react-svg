import { SVGInjector } from '@tanem/svg-injector'
import * as PropTypes from 'prop-types'
import * as React from 'react'

import shallowDiffers from './shallow-differs'
import { Props, State, WrapperType } from './types'

export class ReactSVG extends React.Component<Props, State> {
  static defaultProps = {
    afterInjection: () => undefined,
    beforeInjection: () => undefined,
    evalScripts: 'never',
    fallback: null,
    loading: null,
    renumerateIRIElements: true,
    useRequestCache: true,
    wrapper: 'div',
  }

  static propTypes = {
    afterInjection: PropTypes.func,
    beforeInjection: PropTypes.func,
    evalScripts: PropTypes.oneOf(['always', 'once', 'never']),
    fallback: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.object,
      PropTypes.string,
    ]),
    loading: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.object,
      PropTypes.string,
    ]),
    renumerateIRIElements: PropTypes.bool,
    src: PropTypes.string.isRequired,
    useRequestCache: PropTypes.bool,
    wrapper: PropTypes.oneOf(['div', 'span']),
  }

  initialState = {
    hasError: false,
    isLoading: true,
  }

  state = this.initialState

  _isMounted = false

  container?: WrapperType | null

  nonReactElement?: WrapperType | SVGElement | null

  refCallback = (container: WrapperType | null) => {
    this.container = container
  }

  renderSVG() {
    /* istanbul ignore else */
    if (this.container instanceof Node) {
      const {
        beforeInjection,
        evalScripts,
        renumerateIRIElements,
        src,
        useRequestCache,
      } = this.props

      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      const afterInjection = this.props.afterInjection!
      const wrapper = this.props.wrapper!
      /* eslint-enable @typescript-eslint/no-non-null-assertion */

      const nonReactElement = document.createElement(wrapper)
      nonReactElement.dataset.src = src

      this.nonReactElement = this.container.appendChild(nonReactElement)

      const afterEach = (error: Error | null, svg?: SVGElement) => {
        if (error) {
          this.removeSVG()

          if (!this._isMounted) {
            afterInjection(error)
            return
          }
        }

        this.nonReactElement = svg

        // TODO (Tane): It'd be better to cleanly unsubscribe from SVGInjector
        // callbacks instead of tracking a property like this.
        if (this._isMounted) {
          this.setState(
            () => ({
              hasError: !!error,
              isLoading: false,
            }),
            () => {
              afterInjection(error, svg)
            }
          )
        }
      }

      SVGInjector(nonReactElement, {
        afterEach,
        beforeEach: beforeInjection,
        cacheRequests: useRequestCache,
        evalScripts,
        renumerateIRIElements,
      })
    }
  }

  removeSVG() {
    if (
      this.container instanceof Node &&
      this.nonReactElement instanceof Node
    ) {
      this.container.removeChild(this.nonReactElement)
      this.nonReactElement = null
    }
  }

  componentDidMount() {
    this._isMounted = true
    this.renderSVG()
  }

  componentDidUpdate(prevProps: Props) {
    if (shallowDiffers(prevProps, this.props)) {
      this.setState(
        () => this.initialState,
        () => {
          this.removeSVG()
          this.renderSVG()
        }
      )
    }
  }

  componentWillUnmount() {
    this._isMounted = false
    this.removeSVG()
  }

  render() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      afterInjection,
      beforeInjection,
      evalScripts,
      fallback: Fallback,
      loading: Loading,
      renumerateIRIElements,
      src,
      useRequestCache,
      wrapper,
      ...rest
    } = this.props
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const Wrapper = wrapper!

    return (
      <Wrapper {...rest} ref={this.refCallback}>
        {this.state.isLoading && Loading && <Loading />}
        {this.state.hasError && Fallback && <Fallback />}
      </Wrapper>
    )
  }
}
