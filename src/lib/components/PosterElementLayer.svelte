<script lang="ts">
  import type { PosterElement } from '$lib/posterSchema';

  let {
    element,
    selected,
    interactive = true
  }: {
    element: PosterElement;
    selected: boolean;
    interactive?: boolean;
  } = $props();

  const interactiveClasses = $derived(getPosterElementInteractiveClasses(interactive, selected));
  const sharedStyle = $derived(
    [
      'position:absolute',
      `left:${element.x}%`,
      `top:${element.y}%`,
      `width:${element.width}%`,
      `height:${element.height}%`,
      `z-index:${element.zIndex}`,
      `opacity:${element.opacity}`
    ].join(';')
  );

  const align = $derived(element.align ?? 'center');
  const justifyContent = $derived(alignToJustifyContent(align));
  const shapeStyle = $derived(
    [
      sharedStyle,
      `background-color:${element.backgroundColor}`,
      `border-width:${element.borderWidth ?? 0}px`,
      'border-style:solid',
      `border-color:${element.borderColor ?? 'transparent'}`,
      `border-radius:${element.borderRadius ?? 0}px`
    ].join(';')
  );
  const textStyle = $derived(
    [
      sharedStyle,
      `color:${element.color}`,
      `font-size:${element.fontSize ?? 24}px`,
      `font-weight:${element.fontWeight ?? 'normal'}`,
      `line-height:${element.lineHeight ?? 1.1}`,
      `letter-spacing:${element.letterSpacing ?? 0}px`,
      `text-align:${align}`,
      'display:flex',
      'align-items:center',
      `justify-content:${justifyContent}`,
      'padding:2px 4px',
      'white-space:pre-wrap',
      'word-break:break-word'
    ].join(';')
  );

  function getPosterElementInteractiveClasses(isInteractive: boolean, isSelected: boolean): string {
    if (!isInteractive) {
      return '';
    }
    if (isSelected) {
      return 'transition-all duration-150 cursor-pointer before:absolute before:-inset-1 before:pointer-events-none before:transition-colors outline outline-2 outline-blue-600 outline-offset-1 before:bg-blue-500/20';
    }
    return 'transition-all duration-150 cursor-pointer before:absolute before:-inset-1 before:pointer-events-none before:transition-colors hover:outline hover:outline-2 hover:outline-blue-400 hover:outline-offset-1 hover:before:bg-blue-400/10';
  }

  function alignToJustifyContent(value: 'left' | 'center' | 'right'): 'flex-start' | 'center' | 'flex-end' {
    if (value === 'left') {
      return 'flex-start';
    }
    if (value === 'right') {
      return 'flex-end';
    }
    return 'center';
  }
</script>

{#if element.type === 'shape'}
  <div data-element-id={element.id} class={interactiveClasses} style={shapeStyle}></div>
{:else}
  <div data-element-id={element.id} class={interactiveClasses} style={textStyle}>
    {element.text}
  </div>
{/if}
