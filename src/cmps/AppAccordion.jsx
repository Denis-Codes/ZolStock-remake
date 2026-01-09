import * as React from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export function AppAccordion({
  items = [],
  allowMultiple = false,     // false = only one open
  defaultExpandedId = null,
  getId = (item) => item.id,
  renderSummary,             // (item) => JSX
  renderDetails,             // (item) => JSX
  sx = {},                   // style for accordion
  summarySx = {},
  detailsSx = {},
}) {
//   const [expanded, setExpanded] = React.useState(
//     allowMultiple ? new Set(defaultExpandedId ? [defaultExpandedId] : []) : (defaultExpandedId || '')
//   )

const [expanded, setExpanded] = React.useState(
  allowMultiple ? new Set() : ''
)

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
        setExpanded(isExpanded ? id : '')
      }
    }
  }

  return (
    <div dir="rtl">
      {items.map((item) => {
        const id = getId(item)
        const isOpen = allowMultiple ? expanded.has(id) : expanded === id

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

            <AccordionDetails sx={{ ...detailsSx }}>
              {renderDetails ? renderDetails(item) : null}
            </AccordionDetails>
          </Accordion>
        )
      })}
    </div>
  )
}
