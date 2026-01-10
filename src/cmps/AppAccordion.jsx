// 
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
  maxDetailsHeight = null,   // NEW: max height for scrollable details (e.g., '300px')
   onExpandedChange,
}) {
const [expanded, setExpanded] = React.useState(() => {
  if (allowMultiple) {
    return defaultExpandedId ? new Set([defaultExpandedId]) : new Set()
  }
  return defaultExpandedId ?? ''
})


//   function handleChange(id) {
//     return (_, isExpanded) => {
//       if (allowMultiple) {
//         setExpanded((prev) => {
//           const next = new Set(prev)
//           if (isExpanded) next.add(id)
//           else next.delete(id)
//           return next
//         })
//       } else {
//         setExpanded(isExpanded ? id : '')
//       }
//     }
//   }

function handleChange(id) {
  return (_, isExpanded) => {
    if (!allowMultiple && isExpanded) {
      onExpandedChange?.(id) // ✅ חדש: כשנפתח אזור → מעדכנים בחוץ
    }

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


  // Merge scroll styles with detailsSx
  const finalDetailsSx = maxDetailsHeight
    ? { maxHeight: maxDetailsHeight, overflowY: 'auto', ...detailsSx }
    : detailsSx

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

            <AccordionDetails sx={finalDetailsSx}>
              {renderDetails ? renderDetails(item) : null}
            </AccordionDetails>
          </Accordion>
        )
      })}
    </div>
  )
}