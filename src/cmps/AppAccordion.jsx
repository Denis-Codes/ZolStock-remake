import * as React from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export function AppAccordion({
  items = [],
  allowMultiple = false,
  defaultExpandedId = null,
  expandedId = null,

  getId = (item) => item.id,
  renderSummary,
  renderDetails,
  sx = {},
  summarySx = {},
  detailsSx = {},
  maxDetailsHeight = null,
  onExpandedChange = null,
}) {
  const isControlled = !allowMultiple && expandedId !== null

  const [expanded, setExpanded] = React.useState(
    allowMultiple ? new Set(defaultExpandedId ? [defaultExpandedId] : []) : (defaultExpandedId || '')
  )

  const effectiveExpanded = isControlled ? expandedId : expanded

  React.useEffect(() => {
    if (onExpandedChange && defaultExpandedId && !allowMultiple && !isControlled) {
      onExpandedChange(defaultExpandedId)
    }
  }, []) // eslint-disable-line

  function handleChange(id) {
    return (_, isExpanded) => {
      if (allowMultiple) {
        setExpanded((prev) => {
          const next = new Set(prev)
          if (isExpanded) next.add(id)
          else next.delete(id)
          return next
        })
      } else {
        const newId = isExpanded ? id : ''
        if (!isControlled) setExpanded(newId)

        if (onExpandedChange && isExpanded) {
          onExpandedChange(id)
        }
      }
    }
  }

  const finalDetailsSx = maxDetailsHeight
    ? { maxHeight: maxDetailsHeight, overflowY: 'auto', ...detailsSx }
    : detailsSx

  return (
    <div dir="rtl">
      {items.map((item) => {
        const id = getId(item)
        const isOpen = allowMultiple ? effectiveExpanded.has(id) : effectiveExpanded === id

        return (
          <Accordion
            key={id}
            expanded={isOpen}
            onChange={handleChange(id)}
            disableGutters
            sx={{ boxShadow: 'none', ...sx }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ minHeight: 56, ...summarySx }}
            >
              {renderSummary ? (
                renderSummary(item)
              ) : (
                <Typography sx={{ fontWeight: 600 }}>{String(id)}</Typography>
              )}
            </AccordionSummary>

            <AccordionDetails sx={finalDetailsSx}>
              {renderDetails ? renderDetails(item) : null}
            </AccordionDetails>
          </Accordion>
        )
      })}
    </div>
  )
}
